import {
  BaseConfig,
  BaseController,
  BaseState,
  BN,
  EthGasPriceEstimate,
  FetchGasFeeEstimateOptions,
  GAS_ESTIMATE_TYPES,
  GasFeeEstimates,
  GasFeeState,
  GasFeeStateEthGasPrice,
  GasFeeStateFeeMarket,
  GasFeeStateLegacy,
  Transaction,
  util,
} from '@metamask/controllers';
import { AbortController } from 'abort-controller';
import { BigNumber } from 'bignumber.js';
import EthQuery from 'eth-query';
import abiERC20 from 'human-standard-token-abi';
import { Mutex } from 'async-mutex';
import Web3 from 'web3';

import {
  calcTokenAmount,
  calculateGasEstimateWithRefund,
  calculateGasLimits,
  estimateGas,
  fetchAggregatorMetadata,
  fetchGasPrices,
  fetchTokens,
  fetchTopAssets,
  fetchTradesInfo,
  getSwapsContractAddress,
  SwapsError,
  DEFAULT_ERC20_APPROVE_GAS,
  NATIVE_SWAPS_TOKEN_ADDRESS,
  ETH_CHAIN_ID,
  BSC_CHAIN_ID,
  SWAPS_TESTNET_CHAIN_ID,
  POLYGON_CHAIN_ID,
  shouldEnableDirectWrapping,
} from './swapsUtil';

import {
  APIAggregatorMetadata,
  APIFetchQuotesMetadata,
  APIFetchQuotesParams,
  ChainData,
  ChainCache,
  Quote,
  QuoteSavings,
  QuoteValues,
  SwapsAsset,
  SwapsToken,
} from './swapsInterfaces';

// Functions to determine type of the return value from GasFeeController

function isGasFeeStateEthGasPrice(
  object: GasFeeState,
): object is GasFeeStateEthGasPrice {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE;
}

function isGasFeeStateFeeMarket(
  object: GasFeeState,
): object is GasFeeStateFeeMarket {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET;
}

function isGasFeeStateLegacy(object: GasFeeState): object is GasFeeStateLegacy {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY;
}

// Custom types for custom gas values

interface CustomEthGasPriceEstimate {
  gasPrice: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
}

interface CustomGasFee {
  maxFeePerGas: string; // a GWEI dec string
  maxPriorityFeePerGas: string; // a GWEI dec string
  estimatedBaseFee?: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
}

function isEthGasPriceEstimate(object: any): object is EthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

function isCustomEthGasPriceEstimate(
  object: any,
): object is CustomEthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

function isCustomGasFee(object: any): object is CustomGasFee {
  return (
    Boolean(object) &&
    'maxFeePerGas' in object &&
    'maxPriorityFeePerGas' in object
  );
}

function gweiDecToWEIBN(n: string): BN {
  return util.gweiDecToWEIBN(n);
}

export interface SwapsConfig extends BaseConfig {
  clientId?: string;
  maxGasLimit: number;
  pollCountLimit: number;
  fetchAggregatorMetadataThreshold: number;
  fetchTokensThreshold: number;
  fetchTopAssetsThreshold: number;
  provider: any;
  chainId: string;
  supportedChainIds: string[];
}

export interface SwapsState extends BaseState {
  quotes: { [key: string]: Quote };
  fetchParams: APIFetchQuotesParams;
  fetchParamsMetaData: APIFetchQuotesMetadata;
  topAggSavings: QuoteSavings | null;
  quotesLastFetched: null | number;
  error: { key: null | SwapsError; description: null | string };
  topAggId: null | string;
  isInPolling: boolean;
  pollingCyclesLeft: number;
  approvalTransaction: Transaction | null;
  quoteValues: { [key: string]: QuoteValues } | null;
  quoteRefreshSeconds: number | null;
  usedGasEstimate: EthGasPriceEstimate | GasFeeEstimates | null;
  usedCustomGas: CustomEthGasPriceEstimate | CustomGasFee | null;
  aggregatorMetadata: null | { [key: string]: APIAggregatorMetadata };
  aggregatorMetadataLastFetched: number;
  tokens: null | SwapsToken[];
  tokensLastFetched: number;
  topAssets: null | SwapsAsset[];
  topAssetsLastFetched: number;
  chainCache: ChainCache;
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

export const INITIAL_CHAIN_DATA: ChainData = {
  aggregatorMetadata: null,
  tokens: null,
  topAssets: null,
  aggregatorMetadataLastFetched: 0,
  topAssetsLastFetched: 0,
  tokensLastFetched: 0,
};

/**
 * Gets a new chainCache for a chainId with updated data
 * @param chainCache Current chainCache from state
 * @param chainId Current chainId from the config
 * @param data Data to be updated
 * @returns chainCache with updated data
 */
function getNewChainCache(
  chainCache: ChainCache,
  chainId: string,
  data: Partial<ChainData>,
): ChainCache {
  return {
    ...chainCache,
    [chainId]: {
      ...chainCache?.[chainId],
      ...data,
    },
  };
}

export default class SwapsController extends BaseController<
  SwapsConfig,
  SwapsState
> {
  private handle?: NodeJS.Timeout;

  private web3: any;

  private ethQuery: any;

  private pollCount = 0;

  private mutex = new Mutex();

  private abortController?: AbortController;

  private fetchGasFeeEstimates?: (
    options?: FetchGasFeeEstimateOptions,
  ) => Promise<GasFeeState | undefined>;

  /**
   * Fetch current gas price
   *
   * @returns - Promise resolving to the current gas price or throw an error
   */
  /* istanbul ignore next */
  private async getGasPrice(): Promise<EthGasPriceEstimate | GasFeeEstimates> {
    if (this.fetchGasFeeEstimates) {
      const gasFeeState = await this.fetchGasFeeEstimates({
        shouldUpdateState: this.pollCount === 1,
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
        this.config.chainId,
        this.config.clientId,
      );
      return { gasPrice: proposedGasPrice };
    } catch (e) {
      //
    }

    try {
      const gasPrice = await util.query(this.ethQuery, 'gasPrice');
      return {
        gasPrice: util.weiHexToGweiDec(gasPrice).toString(),
      };
    } catch (e) {
      //
    }
    throw new Error(SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
  }

  /**
   * Calculates a quote `QuotesValue`
   * @param quote Quote object
   * @param gasLimit A hex string representing max units of gas to spend
   * @param gasFeeEstimates current gas fee estimates
   * @param customGasFee custom gas fee values
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

      maxTotalGasInWei = tradeMaxGasLimit.times(
        gweiDecToWEIBN(gasPrice).toString(16),
        16,
      );
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

      maxTotalGasInWei = tradeMaxGasLimit.times(
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
    const destinationAmountBeforeMetaMaskFee = decimalAdjustedDestinationAmount.div(
      tokenPercentageOfPreFeeDestAmount,
    );
    const metaMaskFeeInTokens = destinationAmountBeforeMetaMaskFee.minus(
      decimalAdjustedDestinationAmount,
    );

    const conversionRate = destinationTokenRate || 1;

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

    const maxTotalGasInWei = tradeMaxGasLimit.times(
      gweiDecToWEIBN(gasPrice).toString(16),
      16,
    );
    const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
    const maxWeiFee =
      sourceToken === NATIVE_SWAPS_TOKEN_ADDRESS
        ? maxTotalInWei.minus(sourceAmount, 10)
        : maxTotalInWei;
    const maxEthFee = calcTokenAmount(maxWeiFee, 18).toFixed(18);
    return maxEthFee;
  }

  /**
   * Find best quote and quotes calculated values
   *
   * @param quotes - Array of quotes
   * @returns - Promise resolving to the best quote object and values from quotes
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
   *
   * @param contractAddress - Hex address of the ERC20 contract
   * @param walletAddress - Hex address of the wallet
   * @returns - Promise resolving to allowance number
   */
  /* istanbul ignore next */
  private async getERC20Allowance(
    contractAddress: string,
    walletAddress: string,
  ): Promise<number> {
    const contract = this.web3.eth.contract(abiERC20).at(contractAddress);
    const allowanceTimeout = new Promise<number>((_, reject) => {
      setTimeout(() => {
        reject(new Error(SwapsError.SWAPS_ALLOWANCE_TIMEOUT));
      }, 10000);
    });

    const allowancePromise = new Promise<number>((resolve, reject) => {
      contract.allowance(
        walletAddress,
        getSwapsContractAddress(this.config.chainId),
        (error: Error, result: number) => {
          /* istanbul ignore if */
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        },
      );
    });

    return Promise.race([
      allowanceTimeout,
      allowancePromise,
    ]) as Promise<number>;
  }

  /* istanbul ignore next */
  private timedoutGasReturn(
    tradeTxParams: Transaction | null,
  ): Promise<{ gas: string | null }> {
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

  /* istanbul ignore next */
  private async pollForNewQuotesWithThreshold(fetchThreshold = 0) {
    this.pollCount += 1;
    this.handle && clearTimeout(this.handle);
    if (this.pollCount < this.config.pollCountLimit + 1) {
      !this.state.isInPolling && this.update({ isInPolling: true });
      const {
        nextQuotesState,
        threshold,
        usedGasEstimate,
      } = await this.fetchQuotes();
      this.update({
        pollingCyclesLeft: this.config.pollCountLimit - this.pollCount,
      });

      if (threshold && nextQuotesState?.quoteRefreshSeconds) {
        this.update({ ...this.state, ...nextQuotesState, usedGasEstimate });
        this.handle = setTimeout(async () => {
          this.pollForNewQuotesWithThreshold(threshold);
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
      Object.values(trades).map((trade) => {
        return new Promise<{ gas: string | null; aggId: string }>(
          async (resolve, reject) => {
            try {
              const { gas } = await this.timedoutGasReturn(trade.trade);
              resolve({
                gas,
                aggId: trade.aggregator,
              });
            } catch (e) {
              reject(e);
            }
          },
        );
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
    nextQuotesState: SwapsNextState | null;
    threshold: number | null;
    usedGasEstimate: EthGasPriceEstimate | GasFeeEstimates | null;
  }> {
    const timeStarted = Date.now();
    const { fetchParams } = this.state;
    const { clientId, chainId } = this.config;
    try {
      /** We need to abort quotes fetch if stopPollingAndResetState is called while getting quotes */
      this.abortController = new AbortController();
      const { signal } = this.abortController;
      let quotes: { [key: string]: Quote } = await fetchTradesInfo(
        fetchParams,
        signal,
        chainId,
        clientId,
      );

      if (Object.values(quotes).length === 0) {
        throw new Error(SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
      }

      let approvalTransaction: {
        data?: string;
        from: string;
        to?: string;
        gas?: string;
      } | null = null;

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

        if (Number(allowance) < fetchParams.sourceAmount) {
          approvalTransaction =
            quotesArray.find((quote) => quote.approvalNeeded)?.approvalNeeded ||
            null;

          if (!approvalTransaction) {
            throw new Error(SwapsError.SWAPS_ALLOWANCE_ERROR);
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

      const gasFeeEstimates:
        | EthGasPriceEstimate
        | GasFeeEstimates = await this.getGasPrice();

      const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(
        quotes,
        gasFeeEstimates,
      );

      const quotesLastFetched = Date.now();

      const nextQuotesState: SwapsNextState = {
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
    } catch (e) {
      const errorKey = Object.values(SwapsError).includes(e.message)
        ? e.message
        : SwapsError.ERROR_FETCHING_QUOTES;
      this.stopPollingAndResetState({ key: errorKey, description: e });
      return {
        nextQuotesState: null,
        threshold: null,
        usedGasEstimate: null,
      };
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
   * @param options
   * @param options.fetchGasFeeEstimates - Fetches gas fee estimates from GasFeeController
   * @param config - Initial options used to configure this controller
   * @param state - Initial state to set on this controller
   */
  constructor(
    {
      fetchGasFeeEstimates,
    }: {
      fetchGasFeeEstimates?: () => Promise<GasFeeState | undefined>;
    },
    config?: Partial<SwapsConfig>,
    state?: Partial<SwapsState>,
  ) {
    super(config, state);
    this.defaultConfig = {
      maxGasLimit: 2500000,
      pollCountLimit: 3,
      fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
      fetchTokensThreshold: 1000 * 60 * 60 * 24,
      fetchTopAssetsThreshold: 1000 * 60 * 30,
      provider: undefined,
      chainId: '1',
      supportedChainIds: [
        ETH_CHAIN_ID,
        BSC_CHAIN_ID,
        SWAPS_TESTNET_CHAIN_ID,
        POLYGON_CHAIN_ID,
      ],
      clientId: '',
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
      usedGasEstimate: null,
      usedCustomGas: null,
      chainCache: {
        '1': INITIAL_CHAIN_DATA,
      },
    };

    this.fetchGasFeeEstimates = fetchGasFeeEstimates;
    this.initialize();
  }

  set provider(provider: any) {
    if (provider) {
      this.ethQuery = new EthQuery(provider);
      this.web3 = new Web3(provider);
    }
  }

  set chainId(chainId: string) {
    if (!this.config.supportedChainIds.includes(chainId)) {
      return;
    }

    const { chainCache } = this.state;
    if (chainCache?.[chainId] === undefined) {
      this.update({
        ...INITIAL_CHAIN_DATA,
        chainCache: getNewChainCache(chainCache, chainId, INITIAL_CHAIN_DATA),
      });
      return;
    }

    const cachedData = chainCache?.[chainId] || INITIAL_CHAIN_DATA;
    this.update({
      ...cachedData,
    });
  }

  /**
   * Updates all quotes with a new custom gas price
   *
   * @param customGasFee - Custom gas price in dec gwei format
   */
  updateQuotesWithGasPrice(
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
    this.update({ topAggId, quoteValues, usedCustomGas: customGasFee });
  }

  /**
   * Updates the selected quote maxEthFee param according to a custom gas limit
   *
   * @param customGasLimit - Custom gas limit in hex format
   */
  updateSelectedQuoteWithGasLimit(customGasLimit: string): void {
    const {
      topAggId,
      quotes,
      quoteValues,
      usedGasEstimate,
      usedCustomGas,
    } = this.state;
    if (!topAggId || !quoteValues || !usedGasEstimate) {
      return;
    }
    const selectedQuote = quotes[topAggId];
    const maxEthFee = this.calculatesCustomLimitMaxEthFee(
      selectedQuote,
      usedCustomGas || usedGasEstimate,
      customGasLimit,
    );
    quoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;
    this.update({ topAggId, quoteValues });
  }

  startFetchAndSetQuotes(
    fetchParams: APIFetchQuotesParams,
    fetchParamsMetaData: APIFetchQuotesMetadata,
  ) {
    if (!fetchParams) {
      return null;
    }

    // Every time we get a new request that is not from the polling,
    // we reset the poll count so we can poll for up to three more sets
    // of quotes with these new params.
    this.pollCount = 0;

    this.update({ fetchParams, fetchParamsMetaData });
    this.pollForNewQuotesWithThreshold();
  }

  async fetchTokenWithCache() {
    const { chainId, clientId, fetchTokensThreshold } = this.config;
    const { tokens, tokensLastFetched } = this.state;

    if (!tokens || fetchTokensThreshold < Date.now() - tokensLastFetched) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newTokens = await fetchTokens(chainId, clientId);
        const data = { tokens: newTokens, tokensLastFetched: Date.now() };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } catch {
        const data = { tokensLastFetched: 0 };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } finally {
        releaseLock();
      }
    }
  }

  async fetchTopAssetsWithCache() {
    const { chainId, clientId, fetchTopAssetsThreshold } = this.config;
    const { topAssets, topAssetsLastFetched } = this.state;

    if (
      !topAssets ||
      fetchTopAssetsThreshold < Date.now() - topAssetsLastFetched
    ) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newTopAssets = await fetchTopAssets(chainId, clientId);
        const data = {
          topAssets: newTopAssets,
          topAssetsLastFetched: Date.now(),
        };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } catch {
        const data = { topAssetsLastFetched: 0 };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } finally {
        releaseLock();
      }
    }
  }

  async fetchAggregatorMetadataWithCache() {
    const { chainId, clientId, fetchAggregatorMetadataThreshold } = this.config;
    const { aggregatorMetadata, aggregatorMetadataLastFetched } = this.state;

    if (
      !aggregatorMetadata ||
      fetchAggregatorMetadataThreshold <
        Date.now() - aggregatorMetadataLastFetched
    ) {
      const releaseLock = await this.mutex.acquire();
      try {
        const newAggregatorMetada = await fetchAggregatorMetadata(
          chainId,
          clientId,
        );
        const data = {
          aggregatorMetadata: newAggregatorMetada,
          aggregatorMetadataLastFetched: Date.now(),
        };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } catch {
        const data = { aggregatorMetadataLastFetched: 0 };
        this.update({
          ...data,
          chainCache: getNewChainCache(this.state.chainCache, chainId, data),
        });
      } finally {
        releaseLock();
      }
    }
  }

  /**
   * Stops the polling process
   *
   */
  stopPollingAndResetState(error?: {
    key: SwapsError | null;
    description: string | null;
  }) {
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
      chainCache: this.state.chainCache,
      error,
    });
  }
}
