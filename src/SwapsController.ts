import type { BaseConfig, BaseState } from '@metamask/base-controller';
import { BaseControllerV1 } from '@metamask/base-controller';
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
  GasFeeStateEthGasPrice,
  GasFeeStateFeeMarket,
  GasFeeStateLegacy,
} from '@metamask/gas-fee-controller';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import type { TransactionParams } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { Mutex } from 'async-mutex';
import { BigNumber } from 'bignumber.js';
import abiERC20 from 'human-standard-token-abi';
import * as web3 from 'web3';
import type { Web3 as Web3Type } from 'web3';

import type {
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
  AVALANCHE_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  shouldEnableDirectWrapping,
} from './swapsUtil';

// Hack to fix the issue with the web3 import that works different in app vs tests
const Web3 = web3.Web3 === undefined ? web3.default : web3.Web3;

// Functions to determine type of the return value from GasFeeController

/**
 * Checks if the given object is of type GasFeeStateEthGasPrice.
 * @param object - The gas fee state to be checked.
 * @returns Whether the given object is of type GasFeeStateEthGasPrice.
 */
export function isGasFeeStateEthGasPrice(
  object: GasFeeState,
): object is GasFeeStateEthGasPrice {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.ETH_GASPRICE;
}

/**
 * Determines if the given object is of type GasFeeStateFeeMarket based on its 'gasEstimateType'.
 * @param object - The gas fee state to be evaluated.
 * @returns Whether the object is of type GasFeeStateFeeMarket.
 */
function isGasFeeStateFeeMarket(
  object: GasFeeState,
): object is GasFeeStateFeeMarket {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.FEE_MARKET;
}

/**
 * Determines if the given object is of type GasFeeStateLegacy based on its 'gasEstimateType'.
 * @param object - The gas fee state to be evaluated.
 * @returns Whether the object is of type GasFeeStateLegacy.
 */
export function isGasFeeStateLegacy(
  object: GasFeeState,
): object is GasFeeStateLegacy {
  return object.gasEstimateType === GAS_ESTIMATE_TYPES.LEGACY;
}

// Custom types for custom gas values
type CustomEthGasPriceEstimate = {
  gasPrice: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
};

type CustomGasFee = {
  maxFeePerGas: string; // a GWEI dec string
  maxPriorityFeePerGas: string; // a GWEI dec string
  estimatedBaseFee?: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
};

/**
 * Determines if the given object is of type EthGasPriceEstimate.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type EthGasPriceEstimate.
 */
function isEthGasPriceEstimate(object: any): object is EthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

/**
 * Determines if the given object is of type CustomEthGasPriceEstimate.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type CustomEthGasPriceEstimate.
 */
function isCustomEthGasPriceEstimate(
  object: any,
): object is CustomEthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

/**
 * Determines if the given object is of type CustomGasFee.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type CustomGasFee.
 */
function isCustomGasFee(object: any): object is CustomGasFee {
  return (
    Boolean(object) &&
    'maxFeePerGas' in object &&
    'maxPriorityFeePerGas' in object
  );
}

export type SwapsConfig = {
  clientId?: string;
  maxGasLimit: number;
  pollCountLimit: number;
  fetchAggregatorMetadataThreshold: number;
  fetchTokensThreshold: number;
  fetchTopAssetsThreshold: number;
  provider: any;
  chainId: Hex;
  supportedChainIds: Hex[];
} & BaseConfig;

export type SwapsState = {
  quotes: { [key: string]: Quote };
  fetchParams: APIFetchQuotesParams;
  fetchParamsMetaData: APIFetchQuotesMetadata;
  topAggSavings: QuoteSavings | null;
  quotesLastFetched: null | number;
  error: { key: null | SwapsError; description: null | string };
  topAggId: null | string;
  isInPolling: boolean;
  pollingCyclesLeft: number;
  approvalTransaction: TransactionParams | null;
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
} & BaseState;

type SwapsNextState = {
  quotes: { [key: string]: Quote };
  quotesLastFetched: null | number;
  approvalTransaction: TransactionParams | null;
  topAggId: null | string;
  topAggSavings?: QuoteSavings | null;
  quoteValues: { [key: string]: QuoteValues } | null;
  quoteRefreshSeconds: number | null;
};

export const INITIAL_CHAIN_DATA: ChainData = {
  aggregatorMetadata: null,
  tokens: null,
  topAssets: null,
  aggregatorMetadataLastFetched: 0,
  topAssetsLastFetched: 0,
  tokensLastFetched: 0,
};

/**
 * Gets a new chainCache for a chainId with updated data.
 * @param chainCache - Current chainCache from state.
 * @param chainId - Current chainId from the config.
 * @param data - Data to be updated.
 * @returns The new chainCache.
 */
function getNewChainCache(
  chainCache: ChainCache,
  chainId: Hex,
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

export default class SwapsController extends BaseControllerV1<
  SwapsConfig,
  SwapsState
> {
  private handle?: NodeJS.Timeout;

  private web3: Web3Type;

  private ethQuery: any;

  private pollCount = 0;

  private readonly mutex = new Mutex();

  private abortController?: AbortController;

  private readonly fetchGasFeeEstimates?: (
    options?: FetchGasFeeEstimateOptions,
  ) => Promise<GasFeeState | undefined>;

  private readonly fetchEstimatedMultiLayerL1Fee?: (
    eth: any,
    options: {
      txParams: TransactionParams;
      chainId: Hex;
    },
  ) => Promise<string | undefined>;

  /**
   * Fetch current gas price
   * @returns Promise resolving to the current gas price or throw an error
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
        .allowance(walletAddress, getSwapsContractAddress(this.config.chainId))
        .call();
      return new BigNumber(result.toString());
    };

    return Promise.race([allowanceTimeout, allowancePromise()]);
  }

  /* istanbul ignore next */
  private async timedoutGasReturn(
    tradeTxParams: TransactionParams | null,
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
          },
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
    this.pollCount += 1;
    if (this.handle) {
      clearTimeout(this.handle);
      this.handle = undefined;
    }

    if (this.pollCount < Number(this.config.pollCountLimit) + 1) {
      if (!this.state.isInPolling) {
        this.update({ isInPolling: true });
      }
      const { nextQuotesState, threshold, usedGasEstimate } =
        await this.fetchQuotes();

      this.update({
        pollingCyclesLeft: this.config.pollCountLimit - this.pollCount,
      });

      if (threshold && nextQuotesState?.quoteRefreshSeconds) {
        this.update({ ...this.state, ...nextQuotesState, usedGasEstimate });
        this.handle = setTimeout(() => {
          this.pollForNewQuotesWithThreshold(threshold)
            .then(() => {
              this.update({ isInPolling: false });
            })
            .catch(() => {
              this.update({ isInPolling: false });
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

      if (chainId === OPTIMISM_CHAIN_ID && Object.values(quotes).length > 0) {
        // Fetch an L1 fee for each quote on Optimism.
        await Promise.all(
          Object.values(quotes).map(async (quote) => {
            if (quote.trade && this.fetchEstimatedMultiLayerL1Fee) {
              const multiLayerL1TradeFeeTotal =
                await this.fetchEstimatedMultiLayerL1Fee(this.ethQuery, {
                  txParams: quote.trade,
                  chainId,
                });
              // eslint-disable-next-line require-atomic-updates
              quote.multiLayerL1TradeFeeTotal = multiLayerL1TradeFeeTotal;
            }
            return quote;
          }),
        );
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
          });

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
   * Name of this controller used during composition
   */
  name = 'SwapsController';

  /**
   * List of required sibling controllers this controller needs to function
   */
  requiredControllers = [];

  /**
   * Creates a SwapsController instance.
   * @param options - Constructor options.
   * @param options.fetchGasFeeEstimates - Fetches gas fee estimates from GasFeeController.
   * @param options.fetchEstimatedMultiLayerL1Fee - Fetches an L1 fee for a given transaction.
   * @param config - Initial options used to configure this controller.
   * @param state - Initial state to set on this controller.
   */
  constructor(
    {
      fetchGasFeeEstimates,
      fetchEstimatedMultiLayerL1Fee,
    }: {
      fetchGasFeeEstimates?: () => Promise<GasFeeState | undefined>;
      fetchEstimatedMultiLayerL1Fee?: (
        eth: EthQuery,
        options: {
          txParams: TransactionParams;
          chainId: Hex;
        },
      ) => Promise<string | undefined>;
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
      chainId: '0x1',
      supportedChainIds: [
        ETH_CHAIN_ID,
        BSC_CHAIN_ID,
        SWAPS_TESTNET_CHAIN_ID,
        POLYGON_CHAIN_ID,
        AVALANCHE_CHAIN_ID,
      ],
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
      pollingCyclesLeft: config?.pollCountLimit ?? 3,
      quoteRefreshSeconds: null,
      usedGasEstimate: null,
      usedCustomGas: null,
      chainCache: {
        '0x1': INITIAL_CHAIN_DATA,
      },
    };

    this.fetchGasFeeEstimates = fetchGasFeeEstimates;
    this.fetchEstimatedMultiLayerL1Fee = fetchEstimatedMultiLayerL1Fee;
    this.initialize();
  }

  set provider(provider: any) {
    if (provider) {
      this.ethQuery = new EthQuery(provider);
      this.web3 = new Web3(provider);
    }
  }

  set chainId(chainId: Hex) {
    if (!this.config.supportedChainIds.includes(chainId)) {
      return;
    }

    const { chainCache } = this.state;
    if (!chainCache?.[chainId]) {
      this.update({
        ...INITIAL_CHAIN_DATA,
        chainCache: getNewChainCache(chainCache, chainId, INITIAL_CHAIN_DATA),
      });
      return;
    }

    const cachedData = chainCache[chainId];
    this.update({
      ...cachedData,
    });
  }

  /**
   * Updates all quotes with a new custom gas price.
   * @param customGasFee - Custom gas price in dec gwei format.
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
   * Updates the selected quote maxEthFee param according to a custom gas limit.
   * @param customGasLimit - Custom gas limit in hex format.
   */
  updateSelectedQuoteWithGasLimit(customGasLimit: string): void {
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
    quoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;
    this.update({ topAggId, quoteValues });
  }

  startFetchAndSetQuotes(
    fetchParams?: APIFetchQuotesParams,
    fetchParamsMetaData?: APIFetchQuotesMetadata,
  ) {
    if (!fetchParams) {
      return null;
    }

    // Every time we get a new request that is not from the polling,
    // we reset the poll count so we can poll for up to three more sets
    // of quotes with these new params.
    this.pollCount = 0;

    this.update({ fetchParams, fetchParamsMetaData });

    // ignoring rule since otherwise we need to change the behavior of the function
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    this.pollForNewQuotesWithThreshold();
  }

  async fetchTokenWithCache() {
    const { chainId, clientId, fetchTokensThreshold, supportedChainIds } =
      this.config;
    const { tokens, tokensLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

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
    const { chainId, clientId, fetchTopAssetsThreshold, supportedChainIds } =
      this.config;
    const { topAssets, topAssetsLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

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
    const {
      chainId,
      clientId,
      fetchAggregatorMetadataThreshold,
      supportedChainIds,
    } = this.config;
    const { aggregatorMetadata, aggregatorMetadataLastFetched } = this.state;

    if (!supportedChainIds.includes(chainId)) {
      return;
    }

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
   * Stops the polling process.
   * @param error - Error object containing the error key and description.
   * @param error.key - Error key.
   * @param error.description - Error description.
   */
  stopPollingAndResetState(
    error: {
      key: SwapsError | null;
      description: string | null;
    } = {
      key: null,
      description: null,
    },
  ) {
    this.abortController && this.abortController.abort();
    this.handle && clearTimeout(this.handle);
    this.pollCount = Number(this.config.pollCountLimit) + 1;
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
