import type { StateMetadata } from '@metamask/base-controller';
import { BaseController } from '@metamask/base-controller';
import {
  gweiDecToWEIBN,
  query,
  weiHexToGweiDec,
} from '@metamask/controller-utils';
import EthQuery from '@metamask/eth-query';
import type {
  EthGasPriceEstimate,
  FetchGasFeeEstimateOptions,
  GasFeeEstimates,
  GasFeeState,
} from '@metamask/gas-fee-controller';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import type { Hex } from '@metamask/utils';
import { Mutex } from 'async-mutex';
import { BigNumber } from 'bignumber.js';
import abiERC20 from 'human-standard-token-abi';
import type { Web3 as Web3Type } from 'web3';
import * as web3 from 'web3';

import {
  calcTokenAmount,
  calculateGasEstimateWithRefund,
  calculateGasLimits,
  controllerName,
  DEFAULT_ERC20_APPROVE_GAS,
  estimateGas,
  fetchAggregatorMetadata,
  fetchGasPrices,
  fetchTokens,
  fetchTopAssets,
  fetchTradesInfo,
  getDefaultSwapsControllerState,
  getNewChainCache,
  getSwapsContractAddress,
  INITIAL_CHAIN_DATA,
  isCustomEthGasPriceEstimate,
  isCustomGasFee,
  isEthGasPriceEstimate,
  isGasFeeStateEthGasPrice,
  isGasFeeStateFeeMarket,
  isGasFeeStateLegacy,
  NATIVE_SWAPS_TOKEN_ADDRESS,
  OPTIMISM_CHAIN_ID,
  shouldEnableDirectWrapping,
  SwapsError,
} from './swapsUtil';
import type {
  APIFetchQuotesMetadata,
  APIFetchQuotesParams,
  CustomEthGasPriceEstimate,
  CustomGasFee,
  Quote,
  QuoteValues,
  SwapsConfig,
  SwapsControllerMessenger,
  SwapsControllerOptions,
  SwapsControllerState,
  TxParams,
} from './types';

// Hack to fix the issue with the web3 import that works different in app vs tests
const Web3 = web3.Web3 === undefined ? web3.default : web3.Web3;

const metadata: StateMetadata<SwapsControllerState> = {
  quotes: { persist: false, anonymous: false },
  quoteValues: { persist: false, anonymous: false },
  fetchParams: { persist: false, anonymous: false },
  fetchParamsMetaData: { persist: false, anonymous: false },
  topAggSavings: { persist: false, anonymous: false },
  aggregatorMetadata: { persist: false, anonymous: false },
  tokens: { persist: false, anonymous: false },
  topAssets: { persist: false, anonymous: false },
  approvalTransaction: { persist: false, anonymous: false },
  aggregatorMetadataLastFetched: { persist: false, anonymous: false },
  quotesLastFetched: { persist: false, anonymous: false },
  topAssetsLastFetched: { persist: false, anonymous: false },
  error: { persist: false, anonymous: false },
  topAggId: { persist: false, anonymous: false },
  tokensLastFetched: { persist: false, anonymous: false },
  isInPolling: { persist: false, anonymous: false },
  pollingCyclesLeft: { persist: false, anonymous: false },
  quoteRefreshSeconds: { persist: false, anonymous: false },
  usedGasEstimate: { persist: false, anonymous: false },
  usedCustomGas: { persist: false, anonymous: false },
  chainCache: { persist: false, anonymous: false },
  config: { persist: false, anonymous: false },
};

export default class SwapsController extends BaseController<
  typeof controllerName,
  SwapsControllerState,
  SwapsControllerMessenger
> {
  web3: Web3Type;

  ethQuery: EthQuery;

  #pollCount = 0;

  #abortController?: AbortController;

  #mutex = new Mutex();

  private handle?: NodeJS.Timeout;

  // TODO: Remove once GasFeeController exports this action type
  readonly #fetchGasFeeEstimates?: (
    options?: FetchGasFeeEstimateOptions,
  ) => Promise<GasFeeState | undefined>;

  readonly #fetchEstimatedMultiLayerL1Fee?: (
    eth: any,
    options: {
      txParams: TxParams;
      chainId: Hex;
    },
  ) => Promise<string | undefined>;

  /**
   * Fetch current gas price
   * @returns Promise resolving to the current gas price or throw an error
   */
  /* istanbul ignore next */
  private async getGasPrice(): Promise<EthGasPriceEstimate | GasFeeEstimates> {
    if (this.#fetchGasFeeEstimates) {
      const gasFeeState = await this.#fetchGasFeeEstimates({
        shouldUpdateState: this.#pollCount === 1,
      });
      if (
        !gasFeeState ||
        gasFeeState.gasEstimateType === GAS_ESTIMATE_TYPES.NONE
      ) {
        throw new Error(SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
      }

      if (isGasFeeStateFeeMarket(gasFeeState)) {
        return gasFeeState.gasFeeEstimates;
      } else if (isGasFeeStateLegacy(gasFeeState)) {
        return { gasPrice: gasFeeState.gasFeeEstimates.medium };
      } else if (isGasFeeStateEthGasPrice(gasFeeState)) {
        return { gasPrice: gasFeeState.gasFeeEstimates.gasPrice };
      }
    }

    try {
      const { proposedGasPrice } = await fetchGasPrices(
        this.state.config.chainId,
        this.state.config.clientId,
      );
      return { gasPrice: proposedGasPrice };
    } catch (error) {
      //
    }

    try {
      const gasPrice = await query(this.ethQuery, 'gasPrice');
      return {
        gasPrice: weiHexToGweiDec(gasPrice).toString(),
      };
    } catch (error) {
      //
    }
    throw new Error(SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
  }

  /**
   * Calculates a quote `QuotesValue`
   * @param quote - Quote object
   * @param gasLimit - A hex string representing max units of gas to spend
   * @param gasFeeEstimates - current gas fee estimates
   * @param customGasFee - custom gas fee values
   */
  /* istanbul ignore next */
  private calculateQuoteValues(
    quote: Quote,
    gasLimit: string | null,
    gasFeeEstimates: GasFeeEstimates | EthGasPriceEstimate,
    customGasFee?: CustomEthGasPriceEstimate | CustomGasFee,
  ): QuoteValues {
    const { destinationTokenInfo } = this.state.fetchParamsMetaData;
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
      destinationTokenRate,
      multiLayerL1TradeFeeTotal,
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

    let totalGasInWei: BigNumber;
    let maxTotalGasInWei: BigNumber;

    if (isEthGasPriceEstimate(gasFeeEstimates)) {
      const gasPrice = isCustomEthGasPriceEstimate(customGasFee)
        ? customGasFee.gasPrice
        : gasFeeEstimates.gasPrice;

      totalGasInWei = tradeGasLimit.times(
        gweiDecToWEIBN(gasPrice).toString(16),
        16,
      );

      maxTotalGasInWei = new BigNumber(tradeMaxGasLimit).times(
        gweiDecToWEIBN(gasPrice).toString(16),
        16,
      );

      if (multiLayerL1TradeFeeTotal) {
        totalGasInWei = totalGasInWei.plus(multiLayerL1TradeFeeTotal, 16);
        maxTotalGasInWei = maxTotalGasInWei.plus(multiLayerL1TradeFeeTotal, 16);
      }
    } else {
      const estimatedBaseFee =
        (isCustomGasFee(customGasFee) && customGasFee?.estimatedBaseFee) ||
        gasFeeEstimates.estimatedBaseFee;

      const [maxFeePerGas, maxPriorityFeePerGas] = isCustomGasFee(customGasFee)
        ? [customGasFee.maxFeePerGas, customGasFee.maxPriorityFeePerGas]
        : [
            gasFeeEstimates.high.suggestedMaxFeePerGas,
            gasFeeEstimates.high.suggestedMaxPriorityFeePerGas,
          ];

      totalGasInWei = tradeGasLimit.times(
        gweiDecToWEIBN(estimatedBaseFee)
          .add(gweiDecToWEIBN(maxPriorityFeePerGas))
          .toString(16),
        16,
      );

      maxTotalGasInWei = new BigNumber(tradeMaxGasLimit).times(
        gweiDecToWEIBN(maxFeePerGas).toString(16),
        16,
      );
    }

    // totalGas + trade value
    // trade.value is a sum of different values depending on the transaction.
    // It always includes any external fees charged by the quote source. In
    // addition, if the source asset is NATIVE, trade.value includes the amount
    // of swapped NATIVE.
    const totalInWei = totalGasInWei.plus(trade.value, 16);
    const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);

    // if value in trade, NATIVE fee will be the gas, if not it will be the total wei
    const weiFee =
      sourceToken === NATIVE_SWAPS_TOKEN_ADDRESS
        ? totalInWei.minus(sourceAmount, 10)
        : totalInWei; // sourceAmount is in wei : totalInWei;
    const maxWeiFee =
      sourceToken === NATIVE_SWAPS_TOKEN_ADDRESS
        ? maxTotalInWei.minus(sourceAmount, 10)
        : maxTotalInWei; // sourceAmount is in wei : totalInWei;
    const ethFee = calcTokenAmount(weiFee, 18);
    const maxEthFee = calcTokenAmount(maxWeiFee, 18);

    const decimalAdjustedDestinationAmount = calcTokenAmount(
      destinationAmount,
      destinationTokenInfo.decimals,
    );

    // fees
    const tokenPercentageOfPreFeeDestAmount = new BigNumber(100, 10)
      .minus(metaMaskFee, 10)
      .div(100);
    const destinationAmountBeforeMetaMaskFee =
      decimalAdjustedDestinationAmount.div(tokenPercentageOfPreFeeDestAmount);
    const metaMaskFeeInTokens = destinationAmountBeforeMetaMaskFee.minus(
      decimalAdjustedDestinationAmount,
    );

    const conversionRate = destinationTokenRate ?? 1;

    const ethValueOfTokens = decimalAdjustedDestinationAmount.times(
      conversionRate,
      10,
    );

    // the more tokens the better
    const overallValueOfQuote = ethValueOfTokens.minus(ethFee, 10);

    const quoteValues: QuoteValues = {
      aggregator,
      tradeGasLimit: tradeGasLimit.toString(10),
      tradeMaxGasLimit: tradeMaxGasLimit.toString(10),
      ethFee: ethFee.toFixed(18),
      maxEthFee: maxEthFee.toFixed(18),
      ethValueOfTokens: ethValueOfTokens.toFixed(18),
      overallValueOfQuote: overallValueOfQuote.toFixed(18),
      metaMaskFeeInEth: metaMaskFeeInTokens.times(conversionRate).toFixed(18),
    };

    return quoteValues;
  }

  /* istanbul ignore next */
  private calculatesCustomLimitMaxEthFee(
    quote: Quote,
    gasFee:
      | EthGasPriceEstimate
      | GasFeeEstimates
      | CustomGasFee
      | CustomEthGasPriceEstimate,
    gasLimit: string,
  ): string {
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

    let gasPrice;
    if (isCustomEthGasPriceEstimate(gasFee) || isEthGasPriceEstimate(gasFee)) {
      gasPrice = gasFee.gasPrice;
    } else if (isCustomGasFee(gasFee)) {
      gasPrice = gasFee.maxFeePerGas;
    } else {
      gasPrice = gasFee.high.suggestedMaxFeePerGas;
    }

    const maxTotalGasInWei = new BigNumber(tradeMaxGasLimit).times(
      gweiDecToWEIBN(gasPrice).toString(16),
      16,
    );
    const maxTotalInWei = maxTotalGasInWei.plus(trade.value ?? '0x0', 16);
    const maxWeiFee =
      sourceToken === NATIVE_SWAPS_TOKEN_ADDRESS
        ? maxTotalInWei.minus(sourceAmount, 10)
        : maxTotalInWei;
    const maxEthFee = calcTokenAmount(maxWeiFee, 18).toFixed(18);
    return maxEthFee;
  }

  /**
   * Find best quote and quotes calculated values
   * @param quotes - Array of quotes
   * @returns Promise resolving to the best quote object and values from quotes
   */
  /* istanbul ignore next */
  private getBestQuoteAndQuotesValues(
    quotes: { [key: string]: Quote },
    gasFeeEstimates: EthGasPriceEstimate | GasFeeEstimates,
    customGasFee?: CustomEthGasPriceEstimate | CustomGasFee,
  ): { topAggId: string; quoteValues: { [key: string]: QuoteValues } } {
    let topAggId = '';
    let overallValueOfBestQuoteForSorting: BigNumber | null = null;

    const quoteValues: { [key: string]: QuoteValues } = {};

    Object.values(quotes).forEach((quote: Quote) => {
      const quoteValue = this.calculateQuoteValues(
        quote,
        null,
        gasFeeEstimates,
        customGasFee,
      );
      quoteValues[quoteValue.aggregator] = quoteValue;

      const bnOverallValueOfQuote = new BigNumber(
        quoteValue.overallValueOfQuote,
      );
      if (
        !overallValueOfBestQuoteForSorting ||
        bnOverallValueOfQuote.gt(overallValueOfBestQuoteForSorting)
      ) {
        topAggId = quote.aggregator;
        overallValueOfBestQuoteForSorting = bnOverallValueOfQuote;
      }
    });

    return { topAggId, quoteValues };
  }

  /**
   * Get current allowance for a wallet address to access ERC20 contract address funds
   * it will throw after 10 secs
   * @param contractAddress - Hex address of the ERC20 contract
   * @param walletAddress - Hex address of the wallet
   * @returns Promise resolving to allowance number
   */
  /* istanbul ignore next */
  private async getERC20Allowance(
    contractAddress: string,
    walletAddress: string,
  ): Promise<BigNumber> {
    const contract = new this.web3.eth.Contract(abiERC20, contractAddress);
    const allowanceTimeout = new Promise<BigNumber>((_, reject) => {
      setTimeout(() => {
        reject(new Error(SwapsError.SWAPS_ALLOWANCE_TIMEOUT));
      }, 10000);
    });

    const allowancePromise = async () => {
      const result: bigint = await contract.methods
        .allowance(
          walletAddress,
          getSwapsContractAddress(this.state.config.chainId),
        )
        .call();
      return new BigNumber(result.toString());
    };

    return Promise.race([allowanceTimeout, allowancePromise()]);
  }

  /* istanbul ignore next */
  private async timedoutGasReturn(
    tradeTxParams: TxParams | null,
  ): Promise<{ gas: string | null }> {
    if (!tradeTxParams) {
      return { gas: null };
    }

    const gasTimeout = new Promise<{ gas: string | null }>((resolve) => {
      setTimeout(() => resolve({ gas: null }), 5000);
    });

    try {
      return await Promise.race([
        estimateGas(
          {
            data: tradeTxParams.data,
            from: tradeTxParams.from,
            to: tradeTxParams.to,
            value: tradeTxParams.value,
          } as TxParams,
          this.ethQuery,
        ),
        gasTimeout,
      ]);
    } catch (error) {
      return { gas: null };
    }
  }

  /* istanbul ignore next */
  private async pollForNewQuotesWithThreshold(
    fetchThreshold = 0,
  ): Promise<void> {
    this.#pollCount += 1;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = undefined;
    }

    if (this.#pollCount < Number(this.state.config.pollCountLimit) + 1) {
      if (!this.state.isInPolling) {
        this.update((_state) => {
          _state.isInPolling = true;
        });
      }
      const { nextQuotesState, threshold, usedGasEstimate } =
        await this.fetchQuotes();

      this.update((_state) => {
        _state.pollingCyclesLeft =
          _state.config.pollCountLimit - this.#pollCount;
      });

      if (threshold && nextQuotesState?.quoteRefreshSeconds) {
        this.update((_state) => {
          _state.quotes = nextQuotesState.quotes ?? _state.quotes;
          _state.quotesLastFetched = nextQuotesState.quotesLastFetched ?? 0;
          _state.approvalTransaction =
            nextQuotesState.approvalTransaction ?? null;
          _state.topAggId = nextQuotesState.topAggId ?? _state.topAggId;
          _state.quoteValues =
            nextQuotesState.quoteValues ?? _state.quoteValues;
          _state.quoteRefreshSeconds = nextQuotesState.quoteRefreshSeconds ?? 0;
          _state.usedGasEstimate = usedGasEstimate;
        });
        this.handle = setTimeout(() => {
          this.pollForNewQuotesWithThreshold(threshold).catch(() => {
            this.update((_state) => {
              _state.isInPolling = false;
            });
          });
        }, nextQuotesState.quoteRefreshSeconds * 1000 - threshold);
      }
    } else {
      this.handle = setTimeout(() => {
        this.stopPollingAndResetState({
          key: SwapsError.QUOTES_EXPIRED_ERROR,
          description: null,
        });
      }, fetchThreshold);
    }
  }

  /* istanbul ignore next */
  private async getAllQuotesWithGasEstimates(trades: {
    [key: string]: Quote;
  }): Promise<{ [key: string]: Quote }> {
    const quoteGasData = await Promise.all(
      Object.values(trades).map(async (trade) => {
        try {
          const { gas } = await this.timedoutGasReturn(trade.trade);
          return {
            gas,
            aggId: trade.aggregator,
          };
        } catch (error) {
          throw new Error(SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
        }
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

  /* istanbul ignore next */
  private async fetchQuotes(): Promise<{
    nextQuotesState: Partial<SwapsControllerState> | null;
    threshold: number | null;
    usedGasEstimate: EthGasPriceEstimate | GasFeeEstimates | null;
  }> {
    const timeStarted = Date.now();
    const { fetchParams } = this.state;
    const { clientId, chainId } = this.state.config;
    try {
      /** We need to abort quotes fetch if stopPollingAndResetState is called while getting quotes */
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      let quotes: { [key: string]: Quote } = await fetchTradesInfo(
        fetchParams,
        signal,
        chainId,
        clientId,
      );

      if (Object.values(quotes).length === 0) {
        throw new Error(SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
      }

      if (chainId === OPTIMISM_CHAIN_ID && Object.values(quotes).length > 0) {
        // Fetch an L1 fee for each quote on Optimism.
        await Promise.all(
          Object.values(quotes).map(async (quote) => {
            if (quote.trade && this.#fetchEstimatedMultiLayerL1Fee) {
              const multiLayerL1TradeFeeTotal =
                await this.#fetchEstimatedMultiLayerL1Fee(this.ethQuery, {
                  txParams: quote.trade,
                  chainId,
                });
              // eslint-disable-next-line require-atomic-updates
              quote.multiLayerL1TradeFeeTotal =
                multiLayerL1TradeFeeTotal ?? null;
            }
            return quote;
          }),
        );
      }

      let approvalTransaction: TxParams | null = null;

      const enableDirectWrappingParam = shouldEnableDirectWrapping(
        chainId,
        fetchParams.sourceToken,
        fetchParams.destinationToken,
      );

      const quotesArray = Object.values(quotes);

      const onlyContractQuote =
        quotesArray.length === 1 && quotesArray[0].aggType === 'CONTRACT';

      const enableDirectWrapping =
        enableDirectWrappingParam && onlyContractQuote;

      if (
        fetchParams.sourceToken !== NATIVE_SWAPS_TOKEN_ADDRESS &&
        !enableDirectWrapping
      ) {
        const allowance = await this.getERC20Allowance(
          fetchParams.sourceToken,
          fetchParams.walletAddress,
        );

        // On Android, trying to cast a massive BigInt to a number will result in null
        // allowance and sourceAmount are in Solidity atomic amounts, so they can be bigger than a JS Number
        if (allowance.isLessThan(new BigNumber(fetchParams.sourceAmount))) {
          approvalTransaction =
            quotesArray.find((quote) => quote.approvalNeeded)?.approvalNeeded ??
            null;

          if (!approvalTransaction) {
            throw new Error(SwapsError.SWAPS_ALLOWANCE_ERROR);
          }

          const { gas: approvalGas } = await this.timedoutGasReturn({
            data: approvalTransaction.data,
            from: approvalTransaction.from,
            to: approvalTransaction.to,
          } as TxParams);

          approvalTransaction = {
            ...approvalTransaction,
            gas: approvalGas ?? DEFAULT_ERC20_APPROVE_GAS,
          };
        }
      }

      quotes = await this.getAllQuotesWithGasEstimates(quotes);

      const gasFeeEstimates: EthGasPriceEstimate | GasFeeEstimates =
        await this.getGasPrice();

      const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(
        quotes,
        gasFeeEstimates,
      );

      const quotesLastFetched = Date.now();

      const nextQuotesState: Partial<SwapsControllerState> = {
        quotes,
        quotesLastFetched,
        approvalTransaction,
        topAggId: quotes[topAggId]?.aggregator,
        quoteValues,
        quoteRefreshSeconds: quotes[topAggId]?.quoteRefreshSeconds,
      };
      return {
        nextQuotesState,
        threshold: quotesLastFetched - timeStarted,
        usedGasEstimate: gasFeeEstimates,
      };
    } catch (error: any) {
      const errorKey = Object.values(SwapsError).includes(error.message)
        ? error.message
        : SwapsError.ERROR_FETCHING_QUOTES;
      this.stopPollingAndResetState({ key: errorKey, description: error });
      return {
        nextQuotesState: null,
        threshold: null,
        usedGasEstimate: null,
      };
    }
  }

  /**
   * Creates a SwapsController instance.
   * @param opts - Constructor options.
   * @param opts.fetchGasFeeEstimates - Fetches gas fee estimates from GasFeeController.
   * @param opts.fetchEstimatedMultiLayerL1Fee - Fetches an L1 fee for a given transaction.
   * @param opts.messenger - The messaging system used by the controller.
   * @param state - Initial state to set on this controller.
   */
  constructor(
    opts: SwapsControllerOptions,
    state: Partial<SwapsControllerState>,
  ) {
    super({
      name: controllerName,
      metadata,
      messenger: opts.messenger,
      state: {
        ...getDefaultSwapsControllerState(),
        ...state,
      },
    });

    this.messagingSystem.registerActionHandler(
      `SwapsController:updateQuotesWithGasPrice`,
      this.updateQuotesWithGasPrice.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:updateSelectedQuoteWithGasLimit`,
      this.updateSelectedQuoteWithGasLimit.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:startFetchAndSetQuotes`,
      this.startFetchAndSetQuotes.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:fetchTokenWithCache`,
      this.fetchTokenWithCache.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:fetchTopAssetsWithCache`,
      this.fetchTopAssetsWithCache.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:fetchAggregatorMetadataWithCache`,
      this.fetchAggregatorMetadataWithCache.bind(this),
    );

    this.messagingSystem.registerActionHandler(
      `SwapsController:stopPollingAndResetState`,
      this.stopPollingAndResetState.bind(this),
    );


    this.#fetchGasFeeEstimates = opts.fetchGasFeeEstimates;
    this.#fetchEstimatedMultiLayerL1Fee = opts.fetchEstimatedMultiLayerL1Fee;
  }

  /**
   * Updates all quotes with a new custom gas price.
   * @param customGasFee - Custom gas price in dec gwei format.
   */
  public updateQuotesWithGasPrice(
    customGasFee: CustomEthGasPriceEstimate | CustomGasFee,
  ): void {
    const { quotes, usedGasEstimate } = this.state;
    if (!usedGasEstimate) {
      return;
    }
    const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(
      quotes,
      usedGasEstimate,
      customGasFee,
    );
    this.update((_state) => {
      _state.quoteValues = quoteValues;
      _state.topAggId = topAggId;
      _state.usedCustomGas = customGasFee;
    });
  }

  /**
   * Updates the selected quote maxEthFee param according to a custom gas limit.
   * @param customGasLimit - Custom gas limit in hex format.
   */
  public updateSelectedQuoteWithGasLimit(customGasLimit: string): void {
    const { topAggId, quotes, quoteValues, usedGasEstimate, usedCustomGas } =
      this.state;
    if (!topAggId || !quoteValues || !usedGasEstimate) {
      return;
    }
    const selectedQuote = quotes[topAggId];
    const maxEthFee = this.calculatesCustomLimitMaxEthFee(
      selectedQuote,
      usedCustomGas ?? usedGasEstimate,
      customGasLimit,
    );
    const clonedQuoteValues = {
      ...quoteValues,
      [selectedQuote.aggregator]: {
        ...quoteValues[selectedQuote.aggregator],
        maxEthFee,
      },
    };

    clonedQuoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;

    this.update((_state) => {
      _state.topAggId = topAggId;
      _state.quoteValues = clonedQuoteValues;
    });
  }

  /**
   * Starts the polling process.
   * @param fetchParams - Parameters to fetch quotes.
   * @param fetchParamsMetaData - Metadata for the fetchParams.
   * @returns Promise resolving when this operation completes.
   */
  public startFetchAndSetQuotes(
    fetchParams?: APIFetchQuotesParams,
    fetchParamsMetaData?: APIFetchQuotesMetadata,
  ) {
    if (!fetchParams) {
      return null;
    }

    // Every time we get a new request that is not from the polling,
    // we reset the poll count so we can poll for up to three more sets
    // of quotes with these new params.
    this.#pollCount = 0;

    this.update((_state) => {
      _state.fetchParams = fetchParams;
      _state.fetchParamsMetaData =
        fetchParamsMetaData ?? _state.fetchParamsMetaData;
    });

    // ignoring rule since otherwise we need to change the behavior of the function
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.pollForNewQuotesWithThreshold();
  }

  /**
   * Fetches the tokens and updates the state with them.
   */
  public async fetchTokenWithCache() {
    const { chainId, clientId, fetchTokensThreshold, supportedChainIds } =
      this.state.config;
    const { tokens, tokensLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

    if (!tokens || fetchTokensThreshold < Date.now() - tokensLastFetched) {
      const releaseLock = await this.#mutex.acquire();
      try {
        const newTokens = await fetchTokens(chainId, clientId);
        this.update((_state) => {
          _state.tokens = newTokens;
          _state.tokensLastFetched = Date.now();
          _state.chainCache = getNewChainCache(_state.chainCache, chainId, {
            tokens: newTokens,
            tokensLastFetched: Date.now(),
          });
        });
      } catch {
        this.update((_state) => {
          _state.tokensLastFetched = 0;
          _state.chainCache = getNewChainCache(_state.chainCache, chainId, {
            tokensLastFetched: 0,
          });
        });
      } finally {
        releaseLock();
      }
    }
  }

  /**
   * Fetches the top assets and updates the state with them.
   */
  public async fetchTopAssetsWithCache() {
    const { chainId, clientId, fetchTopAssetsThreshold, supportedChainIds } =
      this.state.config;
    const { topAssets, topAssetsLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

    if (
      !topAssets ||
      fetchTopAssetsThreshold < Date.now() - topAssetsLastFetched
    ) {
      const releaseLock = await this.#mutex.acquire();
      try {
        const newTopAssets = await fetchTopAssets(chainId, clientId);
        const data = {
          topAssets: newTopAssets,
          topAssetsLastFetched: Date.now(),
        };
        this.update((_state) => {
          _state.topAssets = data.topAssets;
          _state.topAssetsLastFetched = data.topAssetsLastFetched;
          _state.chainCache = getNewChainCache(
            _state.chainCache,
            chainId,
            data,
          );
        });
      } catch {
        const data = { topAssetsLastFetched: 0 };
        this.update((_state) => {
          _state.topAssetsLastFetched = data.topAssetsLastFetched;
          _state.chainCache = getNewChainCache(
            _state.chainCache,
            chainId,
            data,
          );
        });
      } finally {
        releaseLock();
      }
    }
  }

  /**
   * Fetches the aggregator metadata and updates the state with it.
   */
  public async fetchAggregatorMetadataWithCache() {
    const {
      chainId,
      clientId,
      fetchAggregatorMetadataThreshold,
      supportedChainIds,
    } = this.state.config;
    const { aggregatorMetadata, aggregatorMetadataLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

    if (
      !aggregatorMetadata ||
      fetchAggregatorMetadataThreshold <
        Date.now() - aggregatorMetadataLastFetched
    ) {
      const releaseLock = await this.#mutex.acquire();
      try {
        const newAggregatorMetada = await fetchAggregatorMetadata(
          chainId,
          clientId,
        );
        const data = {
          aggregatorMetadata: newAggregatorMetada,
          aggregatorMetadataLastFetched: Date.now(),
        };
        this.update((_state) => {
          _state.aggregatorMetadata = data.aggregatorMetadata;
          _state.aggregatorMetadataLastFetched =
            data.aggregatorMetadataLastFetched;
          _state.chainCache = getNewChainCache(
            _state.chainCache,
            chainId,
            data,
          );
        });
      } catch {
        const data = { aggregatorMetadataLastFetched: 0 };
        this.update((_state) => {
          _state.aggregatorMetadataLastFetched =
            data.aggregatorMetadataLastFetched;
          _state.chainCache = getNewChainCache(
            _state.chainCache,
            chainId,
            data,
          );
        });
      } finally {
        releaseLock();
      }
    }
  }

  /**
   * Stops the polling process.
   * @param error - Error object containing the error key and description.
   * @param error.key - Error key.
   * @param error.description - Error description.
   */
  public stopPollingAndResetState(
    error: {
      key: SwapsError | null;
      description: string | null;
    } = {
      key: null,
      description: null,
    },
  ) {
    this.#abortController && this.#abortController.abort();
    this.handle && clearTimeout(this.handle);
    this.#pollCount = Number(this.state.config.pollCountLimit) + 1;
    this.update((_state) => {
      const currentState = { ..._state };
      const defaultState = getDefaultSwapsControllerState();
      getKnownPropertyTypes(defaultState).forEach((key) => {
        const typedKey = key;
        (_state as any)[typedKey] = defaultState[typedKey];
      });
      _state.isInPolling = false;
      _state.config = currentState.config;
      _state.tokensLastFetched = currentState.tokensLastFetched;
      _state.topAssetsLastFetched = currentState.topAssetsLastFetched;
      _state.aggregatorMetadataLastFetched =
        currentState.aggregatorMetadataLastFetched;
      _state.tokens = currentState.tokens;
      _state.topAssets = currentState.topAssets;
      _state.aggregatorMetadata = currentState.aggregatorMetadata;
      _state.chainCache = currentState.chainCache;
      _state.error.key = error.key;
      _state.error.description = error.description;
    });
  }

  /**
   * Internal method used to set the chainId in the state. Users should use the `configure` method instead.
   * @param chainId - The chainId to set.
   */
  #setChainId(chainId: Hex) {
    if (!this.state.config.supportedChainIds.includes(chainId)) {
      return;
    }

    const { chainCache } = this.state;
    if (!chainCache?.[chainId]) {
      this.update((_state) => {
        _state.config.chainId = chainId;
        _state.aggregatorMetadata = null;
        _state.tokens = null;
        _state.topAssets = null;
        _state.aggregatorMetadataLastFetched = 0;
        _state.topAssetsLastFetched = 0;
        _state.tokensLastFetched = 0;
        _state.chainCache = getNewChainCache(chainCache, chainId, {
          ...INITIAL_CHAIN_DATA,
        });
      });
      return;
    }

    const cachedData = chainCache[chainId];

    this.update((_state) => {
      _state.config.chainId = chainId;
      _state.aggregatorMetadata = cachedData.aggregatorMetadata;
      _state.tokens = cachedData.tokens;
      _state.topAssets = cachedData.topAssets;
      _state.aggregatorMetadataLastFetched =
  #setProvider(provider: Provider) {
    // @ts-expect-error TODO: align `Web3` with EIP-1193 provider
    this.web3 = new Web3(provider);
    this.ethQuery = new EthQuery(provider);
  }
  }

  #setProvider(provider: any) {
    this.web3 = new Web3(provider);
    this.ethQuery = new EthQuery(provider);
  }

  public configure(config: Partial<SwapsConfig> & { provider?: any }) {
    const { provider, ...serializableConfig } = config;
    if (serializableConfig.chainId) {
      this.#setChainId(serializableConfig.chainId);
    }
    if (provider) {
      this.#setProvider(provider);
    }

    this.update((_state) => {
      _state.config = {
        ..._state.config,
        ...serializableConfig,
      };
    });
  }

  /**
   * Updates the state of the controller for testing purposes.
   * This method should not be used outside of testing.
   * @param newState - The new state to set.
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  public __test__updateState = (
    newState: Partial<SwapsControllerState>,
  ): void => {
    this.update((oldState) => {
      return { ...oldState, ...newState };
    });
  };
}
