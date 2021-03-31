import BigNumber from 'bignumber.js';
import AbortController from 'abort-controller';
import BaseController, { BaseConfig, BaseState } from '../BaseController';
import { calcTokenAmount, estimateGas, query, toChainIdKey } from '../util';
import { Transaction } from '../transaction/TransactionController';
import {
  calculateGasEstimateWithRefund,
  fetchAggregatorMetadata,
  fetchGasPrices,
  fetchTokens,
  fetchTopAssets,
  fetchTradesInfo,
  SwapsError,
  DEFAULT_ERC20_APPROVE_GAS,
  ETH_SWAPS_TOKEN_ADDRESS,
  SWAPS_CONTRACT_ADDRESS,
  calculateGasLimits,
} from './SwapsUtil';
import {
  APIAggregatorMetadata,
  APIFetchQuotesMetadata,
  APIFetchQuotesParams,
  Quote,
  QuoteSavings,
  QuoteValues,
  SwapsAsset,
  SwapsToken,
} from './SwapsInterfaces';

const { Mutex } = require('async-mutex');
const abiERC20 = require('human-standard-token-abi');
const EthQuery = require('ethjs-query');
const Web3 = require('web3');

export interface SwapsConfig extends BaseConfig {
  clientId?: string;
  maxGasLimit: number;
  pollCountLimit: number;
  metaSwapAddress: string;
  fetchAggregatorMetadataThreshold: number;
  fetchTokensThreshold: number;
  fetchTopAssetsThreshold: number;
  provider: any;
  chainId: string | number;
}

export interface SwapsState extends BaseState {
  quotes: { [key: string]: Quote };
  fetchParams: APIFetchQuotesParams;
  fetchParamsMetaData: APIFetchQuotesMetadata;
  topAggSavings: QuoteSavings | null;
  aggregatorMetadata: null | { [key: string]: APIAggregatorMetadata };
  tokens: null | SwapsToken[];
  topAssets: null | SwapsAsset[];
  quotesLastFetched: null | number;
  error: { key: null | SwapsError; description: null | string };
  topAggId: null | string;
  aggregatorMetadataLastFetched: number;
  tokensLastFetched: number;
  topAssetsLastFetched: number;
  isInPolling: boolean;
  pollingCyclesLeft: number;
  approvalTransaction: Transaction | null;
  quoteValues: { [key: string]: QuoteValues } | null;
  quoteRefreshSeconds: number | null;
  usedGasPrice: string | null;
}

interface SwapsNextState {
  quotes: { [key: string]: Quote };
  quotesLastFetched: null | number;
  approvalTransaction: Transaction | null;
  topAggId: null | string;
  topAggSavings?: QuoteSavings | null;
  quoteValues: { [key: string]: QuoteValues } | null;
  quoteRefreshSeconds: number | null;
}

export class SwapsController extends BaseController<SwapsConfig, SwapsState> {
  private handle?: NodeJS.Timer;

  private web3: any;

  private ethQuery: any;

  private pollCount = 0;

  private mutex = new Mutex();

  private abortController?: AbortController;

  /**
   * Fetch current gas price
   *
   * @returns - Promise resolving to the current gas price or throw an error
   */
  private async getGasPrice(): Promise<string> {
    try {
      const { proposedGasPrice } = await fetchGasPrices();
      return proposedGasPrice;
    } catch (e) {
      //
    }
    try {
      const gasPrice = await query(this.ethQuery, 'gasPrice');
      return gasPrice;
    } catch (e) {
      //
    }
    throw new Error(SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
  }

  /**
   * Calculates a quote `QuotesValue`
   *
   * @param quote - Specific quote object
   * @param gasPrice - Gas price in hex format to calculate the `QuotesValue` with
   */
  private calculateQuoteValues(quote: Quote, gasPrice: string, gasLimit: string | null): QuoteValues {
    const { destinationTokenInfo, destinationTokenConversionRate } = this.state.fetchParamsMetaData;
    const {
      aggregator,
      averageGas,
      maxGas,
      destinationAmount = 0,
      fee: metaMaskFee,
      sourceAmount,
      sourceToken,
      trade,
      gasEstimateWithRefund,
      gasEstimate,
      gasMultiplier,
      approvalNeeded,
    } = quote;

    // trade gas
    const { tradeGasLimit, tradeMaxGasLimit } = calculateGasLimits(
      Boolean(approvalNeeded),
      gasEstimateWithRefund,
      gasEstimate,
      averageGas,
      maxGas,
      gasMultiplier,
      gasLimit,
    );

    const totalGasInWei = tradeGasLimit.times(gasPrice, 16);
    const maxTotalGasInWei = tradeMaxGasLimit.times(gasPrice, 16);

    // totalGas + trade value
    // trade.value is a sum of different values depending on the transaction.
    // It always includes any external fees charged by the quote source. In
    // addition, if the source asset is ETH, trade.value includes the amount
    // of swapped ETH.
    const totalInWei = totalGasInWei.plus(trade.value, 16);
    const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);

    // if value in trade, ETH fee will be the gas, if not it will be the total wei
    const weiFee = sourceToken === ETH_SWAPS_TOKEN_ADDRESS ? totalInWei.minus(sourceAmount, 10) : totalInWei; // sourceAmount is in wei : totalInWei;
    const maxWeiFee = sourceToken === ETH_SWAPS_TOKEN_ADDRESS ? maxTotalInWei.minus(sourceAmount, 10) : maxTotalInWei; // sourceAmount is in wei : totalInWei;
    const ethFee = calcTokenAmount(weiFee, 18);
    const maxEthFee = calcTokenAmount(maxWeiFee, 18);

    const decimalAdjustedDestinationAmount = calcTokenAmount(destinationAmount, destinationTokenInfo.decimals);

    // fees
    const tokenPercentageOfPreFeeDestAmount = new BigNumber(100, 10).minus(metaMaskFee, 10).div(100);
    const destinationAmountBeforeMetaMaskFee = decimalAdjustedDestinationAmount.div(tokenPercentageOfPreFeeDestAmount);
    const metaMaskFeeInTokens = destinationAmountBeforeMetaMaskFee.minus(decimalAdjustedDestinationAmount);

    const conversionRate = destinationTokenConversionRate || 1;

    const ethValueOfTokens = decimalAdjustedDestinationAmount.times(conversionRate, 10);

    // the more tokens the better
    const overallValueOfQuote = ethValueOfTokens.minus(ethFee, 10);

    const quoteValues: QuoteValues = {
      aggregator,
      ethFee: ethFee.toFixed(18),
      maxEthFee: maxEthFee.toFixed(18),
      ethValueOfTokens: ethValueOfTokens.toFixed(18),
      overallValueOfQuote: overallValueOfQuote.toFixed(18),
      metaMaskFeeInEth: metaMaskFeeInTokens.times(conversionRate).toFixed(18),
    };

    return quoteValues;
  }

  private calculatesCustomLimitMaxEthFee(quote: Quote, gasPrice: string, gasLimit: string): string {
    const {
      averageGas,
      maxGas,
      sourceAmount,
      sourceToken,
      trade,
      gasEstimateWithRefund,
      gasEstimate,
      gasMultiplier,
      approvalNeeded,
    } = quote;

    const { tradeMaxGasLimit } = calculateGasLimits(
      Boolean(approvalNeeded),
      gasEstimateWithRefund,
      gasEstimate,
      averageGas,
      maxGas,
      gasMultiplier,
      gasLimit,
    );
    const maxTotalGasInWei = tradeMaxGasLimit.times(gasPrice, 16);
    const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
    const maxWeiFee = sourceToken === ETH_SWAPS_TOKEN_ADDRESS ? maxTotalInWei.minus(sourceAmount, 10) : maxTotalInWei;
    const maxEthFee = calcTokenAmount(maxWeiFee, 18).toFixed(18);
    return maxEthFee;
  }

  /**
   * Find best quote and quotes calculated values
   *
   * @param quotes - Array of quotes
   * @returns - Promise resolving to the best quote object and values from quotes
   */
  private getBestQuoteAndQuotesValues(
    quotes: { [key: string]: Quote },
    usedGasPrice: string,
  ): { topAggId: string; quoteValues: { [key: string]: QuoteValues } } {
    let topAggId = '';
    let overallValueOfBestQuoteForSorting: BigNumber | null = null;

    const quoteValues: { [key: string]: QuoteValues } = {};

    Object.values(quotes).forEach((quote: Quote) => {
      const quoteValue = this.calculateQuoteValues(quote, usedGasPrice, null);
      quoteValues[quoteValue.aggregator] = quoteValue;

      const bnOverallValueOfQuote = new BigNumber(quoteValue.overallValueOfQuote);
      if (!overallValueOfBestQuoteForSorting || bnOverallValueOfQuote.gt(overallValueOfBestQuoteForSorting)) {
        topAggId = quote.aggregator;
        overallValueOfBestQuoteForSorting = bnOverallValueOfQuote;
      }
    });

    return { topAggId, quoteValues };
  }

  /**
   * Get current allowance for a wallet address to access ERC20 contract address funds
   * it will throw after 10 secs
   *
   * @param contractAddress - Hex address of the ERC20 contract
   * @param walletAddress - Hex address of the wallet
   * @returns - Promise resolving to allowance number
   */
  private async getERC20Allowance(contractAddress: string, walletAddress: string): Promise<number> {
    const contract = this.web3.eth.contract(abiERC20).at(contractAddress);
    const allowanceTimeout = new Promise<number>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Allowance timeout'));
      }, 10000);
    });

    const allowancePromise = new Promise<number>((resolve, reject) => {
      contract.allowance(walletAddress, SWAPS_CONTRACT_ADDRESS, (error: Error, result: number) => {
        /* istanbul ignore if */
        if (error) {
          reject(error);
          return;
        }
        resolve(result);
      });
    });

    return Promise.race([allowanceTimeout, allowancePromise]) as Promise<number>;
  }

  private timedoutGasReturn(tradeTxParams: Transaction | null): Promise<{ gas: string | null }> {
    if (!tradeTxParams) {
      return new Promise((resolve) => {
        resolve({ gas: null });
      });
    }

    const gasTimeout = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ gas: null });
      }, 5000);
    });

    return new Promise(async (resolve) => {
      const tradeTxParamsForGasEstimate = {
        data: tradeTxParams.data,
        from: tradeTxParams.from,
        to: tradeTxParams.to,
        value: tradeTxParams.value,
      };
      try {
        const gas: { gas: string | null } = (await Promise.race([
          estimateGas(tradeTxParamsForGasEstimate, this.ethQuery),
          gasTimeout,
        ])) as { gas: string | null };
        resolve(gas);
      } catch (e) {
        resolve({ gas: null });
      }
    });
  }

  private async pollForNewQuotesWithThreshold(fetchThreshold = 0) {
    this.pollCount += 1;
    this.handle && clearTimeout(this.handle);
    if (this.pollCount < this.config.pollCountLimit + 1) {
      !this.state.isInPolling && this.update({ isInPolling: true });
      const { nextQuotesState, threshold, usedGasPrice } = await this.fetchQuotes();
      this.update({ pollingCyclesLeft: this.config.pollCountLimit - this.pollCount });
      if (threshold && nextQuotesState?.quoteRefreshSeconds) {
        this.update({ ...this.state, ...nextQuotesState, usedGasPrice });
        this.handle = setTimeout(async () => {
          this.pollForNewQuotesWithThreshold(threshold);
        }, (nextQuotesState.quoteRefreshSeconds * 1000) - threshold);
      }
    } else {
      this.handle = setTimeout(() => {
        this.stopPollingAndResetState({ key: SwapsError.QUOTES_EXPIRED_ERROR, description: null });
      }, fetchThreshold);
    }
  }

  private async getAllQuotesWithGasEstimates(trades: { [key: string]: Quote }): Promise<{ [key: string]: Quote }> {
    const quoteGasData = await Promise.all(
      Object.values(trades).map((trade) => {
        return new Promise<{ gas: string | null; aggId: string }>(async (resolve, reject) => {
          try {
            const { gas } = await this.timedoutGasReturn(trade.trade);
            resolve({
              gas,
              aggId: trade.aggregator,
            });
          } catch (e) {
            reject(e);
          }
        });
      }),
    );

    const newQuotes: { [key: string]: Quote } = {};
    quoteGasData.forEach(({ gas, aggId }) => {
      newQuotes[aggId] = {
        ...trades[aggId],
        gasEstimate: gas,
        gasEstimateWithRefund: calculateGasEstimateWithRefund(
          trades[aggId].maxGas,
          trades[aggId].estimatedRefund,
          gas,
        ).toString(16),
      };
    });
    return newQuotes;
  }

  private async fetchQuotes(): Promise<{
    nextQuotesState: SwapsNextState | null;
    threshold: number | null;
    usedGasPrice: string | null;
  }> {
    const timeStarted = Date.now();
    const { fetchParams } = this.state;
    try {
      /** We need to abort quotes fetch if stopPollingAndResetState is called while getting quotes */
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      let quotes: { [key: string]: Quote } = await fetchTradesInfo(fetchParams, signal, this.config.clientId);

      if (Object.values(quotes).length === 0) {
        throw new Error(SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
      }

      let approvalTransaction: {
        data?: string;
        from: string;
        to?: string;
        gas?: string;
      } | null = null;

      if (fetchParams.sourceToken !== ETH_SWAPS_TOKEN_ADDRESS) {
        const allowance = await this.getERC20Allowance(fetchParams.sourceToken, fetchParams.walletAddress);

        if (Number(allowance) < fetchParams.sourceAmount) {
          approvalTransaction = Object.values(quotes)[0].approvalNeeded;
          if (!approvalTransaction) {
            throw new Error(SwapsError.ERROR_FETCHING_QUOTES);
          }
          const { gas: approvalGas } = await this.timedoutGasReturn({
            data: approvalTransaction.data,
            from: approvalTransaction.from,
            to: approvalTransaction.to,
          });

          approvalTransaction = {
            ...approvalTransaction,
            gas: approvalGas || DEFAULT_ERC20_APPROVE_GAS,
          };
        }
      }
      quotes = await this.getAllQuotesWithGasEstimates(quotes);
      const usedGasPrice = await this.getGasPrice();

      const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, usedGasPrice);

      const quotesLastFetched = Date.now();

      const nextQuotesState: SwapsNextState = {
        quotes,
        quotesLastFetched,
        approvalTransaction,
        topAggId: quotes[topAggId]?.aggregator,
        quoteValues,
        quoteRefreshSeconds: quotes[topAggId]?.quoteRefreshSeconds,
      };
      return { nextQuotesState, threshold: quotesLastFetched - timeStarted, usedGasPrice };
    } catch (e) {
      const errorKey = Object.values(SwapsError).includes(e) ? e : SwapsError.ERROR_FETCHING_QUOTES;
      this.stopPollingAndResetState({ key: errorKey, description: e });
      return { nextQuotesState: null, threshold: null, usedGasPrice: null };
    }
  }

  /**
   * Name of this controller used during composition
   */
  name = 'SwapsController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = [];

  /**
   * Creates a SwapsController instance
   *
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(config?: Partial<SwapsConfig>, state?: Partial<SwapsState>) {
    super(config, state);
    this.defaultConfig = {
      maxGasLimit: 2500000,
      pollCountLimit: 3,
      metaSwapAddress: SWAPS_CONTRACT_ADDRESS,
      fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
      fetchTokensThreshold: 1000 * 60 * 60 * 24,
      fetchTopAssetsThreshold: 1000 * 60 * 30,
      provider: undefined,
      chainId: toChainIdKey('1'),
      clientId: undefined,
    };
    this.defaultState = {
      quotes: {},
      quoteValues: {},
      fetchParams: {
        slippage: 0,
        sourceToken: '',
        sourceAmount: 0,
        destinationToken: '',
        walletAddress: '',
      },
      fetchParamsMetaData: {
        sourceTokenInfo: {
          decimals: 0,
          address: '',
          symbol: '',
        },
        destinationTokenInfo: {
          decimals: 0,
          address: '',
          symbol: '',
        },
        accountBalance: '0x',
      },
      topAggSavings: null,
      aggregatorMetadata: null,
      tokens: null,
      topAssets: null,
      approvalTransaction: null,
      aggregatorMetadataLastFetched: 0,
      quotesLastFetched: 0,
      topAssetsLastFetched: 0,
      error: { key: null, description: null },
      topAggId: null,
      tokensLastFetched: 0,
      isInPolling: false,
      pollingCyclesLeft: config?.pollCountLimit || 3,
      quoteRefreshSeconds: null,
      usedGasPrice: null,
    };

    this.initialize();
  }

  set provider(provider: any) {
    if (provider) {
      this.ethQuery = new EthQuery(provider);
      this.web3 = new Web3(provider);
    }
  }

  /**
   * Updates all quotes with a new custom gas price
   *
   * @param customGasPrice - Custom gas price in hex format
   */
  updateQuotesWithGasPrice(customGasPrice: string): void {
    const { quotes } = this.state;
    const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, customGasPrice);
    this.update({ topAggId, quoteValues });
  }

  /**
   * Updates the selected quote maxEthFee param according to a custom gas limit
   *
   * @param customGasLimit - Custom gas limit in hex format
   */
  updateSelectedQuoteWithGasLimit(customGasLimit: string): void {
    const { topAggId, quotes, quoteValues, usedGasPrice } = this.state;
    if (!topAggId || !quoteValues || !usedGasPrice) {
      return;
    }
    const selectedQuote = quotes[topAggId];
    const maxEthFee = this.calculatesCustomLimitMaxEthFee(selectedQuote, usedGasPrice, customGasLimit);
    quoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;
    this.update({ topAggId, quoteValues });
  }

  startFetchAndSetQuotes(fetchParams: APIFetchQuotesParams, fetchParamsMetaData: APIFetchQuotesMetadata) {
    if (!fetchParams) {
      return null;
    }
    // Every time we get a new request that is not from the polling, we reset the poll count so we can poll for up to three more sets of quotes with these new params.
    this.pollCount = 0;

    this.update({
      fetchParams,
      fetchParamsMetaData,
    });
    this.pollForNewQuotesWithThreshold();
  }

  async fetchTokenWithCache() {
    if (!this.state.tokens || this.config.fetchTokensThreshold < Date.now() - this.state.tokensLastFetched) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newTokens = await fetchTokens();
        this.update({ tokens: newTokens, tokensLastFetched: Date.now() });
      } finally {
        releaseLock();
      }
    }
  }

  async fetchTopAssetsWithCache() {
    if (!this.state.tokens || this.config.fetchTopAssetsThreshold < Date.now() - this.state.topAssetsLastFetched) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newTopAssets = await fetchTopAssets();
        this.update({ topAssets: newTopAssets, topAssetsLastFetched: Date.now() });
      } finally {
        releaseLock();
      }
    }
  }

  async fetchAggregatorMetadataWithCache() {
    if (
      !this.state.aggregatorMetadata ||
      this.config.fetchAggregatorMetadataThreshold < Date.now() - this.state.aggregatorMetadataLastFetched
    ) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newAggregatorMetada = await fetchAggregatorMetadata();
        this.update({ aggregatorMetadata: newAggregatorMetada, aggregatorMetadataLastFetched: Date.now() });
      } finally {
        releaseLock();
      }
    }
  }

  /**
   * Stops the polling process
   *
   */
  stopPollingAndResetState(error?: { key: SwapsError | null; description: string | null }) {
    this.abortController && this.abortController.abort();
    this.handle && clearTimeout(this.handle);
    this.pollCount = this.config.pollCountLimit + 1;
    this.update({
      ...this.defaultState,
      isInPolling: false,
      tokensLastFetched: this.state.tokensLastFetched,
      topAssetsLastFetched: this.state.topAssetsLastFetched,
      aggregatorMetadataLastFetched: this.state.aggregatorMetadataLastFetched,
      tokens: this.state.tokens,
      topAssets: this.state.topAssets,
      aggregatorMetadata: this.state.aggregatorMetadata,
      error,
    });
  }
}

export default SwapsController;
