import {
  BNToHex,
  convertHexToDecimal,
  handleFetch,
  query,
  timeoutFetch,
} from '@metamask/controller-utils';
import type EthQuery from '@metamask/eth-query';
import type {
  EthGasPriceEstimate,
  GasFeeState,
  GasFeeStateEthGasPrice,
  GasFeeStateFeeMarket,
  GasFeeStateLegacy,
} from '@metamask/gas-fee-controller';
import { GAS_ESTIMATE_TYPES } from '@metamask/gas-fee-controller';
import type { TransactionParams } from '@metamask/transaction-controller';
import type { Hex } from '@metamask/utils';
import { add0x, getKnownPropertyNames } from '@metamask/utils';
import { BigNumber } from 'bignumber.js';
import { BN } from 'bn.js';

// eslint-disable-next-line import/order
import {
  ALLOWED_CONTRACT_ADDRESSES,
  API_BASE_URL,
  CHAIN_ID_TO_NAME_MAP,
  DEV_BASE_URL,
  ETH_CHAIN_ID,
  GAS_API_BASE_URL,
  MAX_GAS_LIMIT,
  NATIVE_SWAPS_TOKEN_ADDRESS,
  SWAPS_CONTRACT_ADDRESSES,
  SWAPS_NATIVE_TOKEN_OBJECTS,
  SWAPS_TESTNET_CHAIN_ID,
  SWAPS_WRAPPED_TOKENS_ADDRESSES,
  TOKEN_TRANSFER_LOG_TOPIC_HASH,
} from './constants';

import type {
  APIAggregatorMetadata,
  APIFetchQuotesParams,
  ChainCache,
  ChainData,
  CustomEthGasPriceEstimate,
  CustomGasFee,
  FeatureFlags,
  NetworkFeatureFlags,
  NetworksFeatureStatus,
  Quote,
  QuoteValues,
  SwapsAsset,
  SwapsToken,
  TransactionReceipt,
  TxParams,
} from './types';

// /
// / BEGIN: Lifted from now unexported normalizeTransaction in @metamask/transaction-controller@3.0.0
// /
export const TX_NORMALIZERS = {
  data: (data: string) => add0x(data),
  from: (from: string) => add0x(from).toLowerCase() as Hex,
  gas: (gas: string) => add0x(gas),
  gasPrice: (gasPrice: string) => add0x(gasPrice),
  nonce: (nonce: string) => add0x(nonce),
  to: (to: string) => add0x(to).toLowerCase() as Hex,
  value: (value: string) => add0x(value),
  maxFeePerGas: (maxFeePerGas: string) => add0x(maxFeePerGas),
  maxPriorityFeePerGas: (maxPriorityFeePerGas: string) =>
    add0x(maxPriorityFeePerGas),
  estimatedBaseFee: (maxPriorityFeePerGas: string) =>
    add0x(maxPriorityFeePerGas),
} satisfies {
  [param in keyof TransactionParams]: (arg: string) => Hex;
};

/**
 * Normalizes properties on a Transaction object.
 * @param transaction - Transaction object to normalize.
 * @returns Normalized Transaction object.
 */
export function normalizeTransaction(
  transaction: TransactionParams,
): Pick<TransactionParams, keyof typeof TX_NORMALIZERS> {
  const normalizedTransaction: TransactionParams = { from: '' };
  getKnownPropertyNames(TX_NORMALIZERS).forEach((key) => {
    if (key in transaction && transaction[key]) {
      normalizedTransaction[key] = TX_NORMALIZERS[key](transaction[key]);
    }
  });
  return normalizedTransaction;
}

// /
// / END: Lifted from now unexported normalizeTransaction in @metamask/transaction-controller@3.0.0
// /

export * from './constants';

export enum SwapsError {
  QUOTES_EXPIRED_ERROR = 'quotes-expired',
  SWAP_FAILED_ERROR = 'swap-failed-error',
  ERROR_FETCHING_QUOTES = 'error-fetching-quotes',
  QUOTES_NOT_AVAILABLE_ERROR = 'quotes-not-available',
  OFFLINE_FOR_MAINTENANCE = 'offline-for-maintenance',
  SWAPS_FETCH_ORDER_CONFLICT = 'swaps-fetch-order-conflict',
  SWAPS_GAS_PRICE_ESTIMATION = 'swaps-gas-price-estimation',
  SWAPS_ALLOWANCE_TIMEOUT = 'swaps-allowance-timeout',
  SWAPS_ALLOWANCE_ERROR = 'swaps-allowance-error',
}

export enum APIType {
  TRADES = 'TRADES',
  TOKENS = 'TOKENS',
  TOP_ASSETS = 'TOP_ASSETS',
  FEATURE_FLAG = 'FEATURE_FLAG',
  AGGREGATOR_METADATA = 'AGGREGATOR_METADATA',
  TOKEN = 'TOKEN',
  GAS_PRICES = 'GAS_PRICES',
}

// Functions
/**
 * Returns the client ID header.
 * @param clientId - The client ID.
 * @returns The client ID header.
 */
/**
 * Returns the client ID header if provided.
 * @param clientId - The client ID.
 * @returns The client ID header.
 */
function getClientIdHeader(clientId?: string) {
  if (!clientId) {
    return undefined;
  }
  return {
    'X-Client-Id': clientId,
  };
}

/**
 * Gets the native swaps token for the given chain ID.
 * @param chainId - The chain ID.
 * @returns The native swaps token.
 */
export function getNativeSwapsToken(chainId: Hex): SwapsToken {
  return SWAPS_NATIVE_TOKEN_OBJECTS[chainId];
}

/**
 * Gets the swaps contract address for the given chain ID.
 * @param chainId - The chain ID.
 * @returns The swaps contract address.
 */
export function getSwapsContractAddress(chainId: Hex): string {
  return SWAPS_CONTRACT_ADDRESSES[chainId];
}

/**
 * Checks if the given contract address is valid for the given chain ID.
 * @param chainId - The chain ID.
 * @param contract - The contract address.
 * @returns True if the contract address is valid, false otherwise.
 */
export function isValidContractAddress(
  chainId: Hex,
  contract: string | undefined,
): boolean {
  if (!contract || !ALLOWED_CONTRACT_ADDRESSES[chainId]) {
    return false;
  }
  return ALLOWED_CONTRACT_ADDRESSES[chainId].some(
    (allowedContract) =>
      contract.toLowerCase() === allowedContract.toLowerCase(),
  );
}

/**
 * Checks if direct wrapping should be enabled for the given chain ID, source token, and destination token.
 * @param chainId - The chain ID.
 * @param sourceToken - The source token.
 * @param destinationToken - The destination token.
 * @returns True if direct wrapping should be enabled, false otherwise.
 */
export function shouldEnableDirectWrapping(
  chainId: Hex,
  sourceToken: string,
  destinationToken: string,
): boolean {
  const wrappedTokenLowerCase =
    SWAPS_WRAPPED_TOKENS_ADDRESSES[chainId]?.toLowerCase();
  const nativeTokenLowerCase =
    SWAPS_NATIVE_TOKEN_OBJECTS[chainId].address?.toLowerCase();
  const sourceTokenLowerCase = sourceToken?.toLowerCase();
  const destinationTokenLowerCase = destinationToken?.toLowerCase();
  return (
    (sourceTokenLowerCase === wrappedTokenLowerCase &&
      destinationTokenLowerCase === nativeTokenLowerCase) ||
    (sourceTokenLowerCase === nativeTokenLowerCase &&
      destinationTokenLowerCase === wrappedTokenLowerCase)
  );
}

/**
 * Gets the base API URL for the given API type and chain ID.
 * @param type - The API type.
 * @param chainId - The chain ID.
 * @returns The base API URL.
 */
export const getBaseApiURL = function (type: APIType, chainId: Hex): string {
  const [apiChainId, apiBaseUrl] =
    chainId === SWAPS_TESTNET_CHAIN_ID
      ? [ETH_CHAIN_ID, DEV_BASE_URL]
      : [chainId, API_BASE_URL];
  const apiDecimalChainId: number = convertHexToDecimal(apiChainId);
  switch (type) {
    case APIType.TRADES:
      return `${apiBaseUrl}/networks/${apiDecimalChainId}/trades`;
    case APIType.TOKENS:
      return `${apiBaseUrl}/networks/${apiDecimalChainId}/tokens`;
    case APIType.TOKEN:
      return `${apiBaseUrl}/networks/${apiDecimalChainId}/token`;
    case APIType.TOP_ASSETS:
      return `${apiBaseUrl}/networks/${apiDecimalChainId}/topAssets`;
    case APIType.FEATURE_FLAG:
      return `${apiBaseUrl}/featureFlags`;
    case APIType.AGGREGATOR_METADATA:
      return `${apiBaseUrl}/networks/${apiDecimalChainId}/aggregatorMetadata`;
    case APIType.GAS_PRICES:
      return `${GAS_API_BASE_URL}/networks/${apiDecimalChainId}/gasPrices`;
    default:
      throw new Error('getBaseApiURL requires an api call type');
  }
};

/**
 * Gets the token metadata URL for the given chain ID.
 * @param chainId - The chain ID.
 * @returns The token metadata URL.
 */
export function getTokenMetadataURL(chainId: Hex): string {
  return getBaseApiURL(APIType.TOKEN, chainId);
}

/**
 * Fetches quotes from API URL.
 * @param quoteParams - Quote parameters.
 * @param quoteParams.slippage - Slippage.
 * @param quoteParams.sourceToken - Source token address.
 * @param quoteParams.sourceAmount - Source token amount.
 * @param quoteParams.destinationToken - Destination token address.
 * @param quoteParams.walletAddress - Address to do the swap from.
 * @param abortSignal - Abort signal.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing trades info.
 */
export async function fetchTradesInfo(
  {
    slippage,
    sourceToken,
    sourceAmount,
    destinationToken,
    walletAddress,
  }: APIFetchQuotesParams,
  abortSignal: AbortSignal | null,
  chainId: Hex,
  clientId?: string,
): Promise<{ [key: string]: Quote }> {
  const urlParams: APIFetchQuotesParams = {
    destinationToken,
    sourceToken,
    sourceAmount,
    slippage,
    timeout: 10000,
    walletAddress,
  };

  if (clientId) {
    urlParams.clientId = clientId;
  }

  if (shouldEnableDirectWrapping(chainId, sourceToken, destinationToken)) {
    urlParams.enableDirectWrapping = true;
  }

  const tradeURL = `${getBaseApiURL(
    APIType.TRADES,
    chainId,
  )}?${new URLSearchParams(
    Object.fromEntries(
      Object.entries(urlParams).map(([key, value]) => [key, String(value)]),
    ),
  ).toString()}`;

  const tradesResponse = await timeoutFetch(
    tradeURL,
    {
      method: 'GET',
      signal: abortSignal,
      headers: getClientIdHeader(clientId),
    },
    15000,
  );
  const trades = (await tradesResponse.json()) as Quote[];
  const newQuotes = trades.reduce(
    (aggIdTradeMap: { [key: string]: Quote }, quote: Quote) => {
      if (
        !quote.error &&
        quote.trade &&
        isValidContractAddress(chainId, quote.trade?.to)
      ) {
        const constructedTrade = constructTxParams({
          to: quote.trade.to,
          from: quote.trade.from,
          data: quote.trade.data,
          amount: BNToHex(new BN(quote.trade.value)),
          gas: quote.maxGas
            ? BNToHex(new BN(quote.maxGas))
            : BNToHex(new BN(MAX_GAS_LIMIT)),
        });

        return Object.assign(aggIdTradeMap, {
          [quote.aggregator]: {
            ...quote,
            slippage,
            trade: constructedTrade,
          },
        });
      }

      return aggIdTradeMap;
    },
    {},
  );

  return newQuotes;
}

/**
 * Fetches token metadata from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing token metadata.
 */
export async function fetchTokens(
  chainId: Hex,
  clientId?: string,
): Promise<SwapsToken[]> {
  const tokenUrl = getBaseApiURL(APIType.TOKENS, chainId);
  const tokens: SwapsToken[] = await handleFetch(tokenUrl, {
    method: 'GET',
    headers: getClientIdHeader(clientId),
  });
  const filteredTokens = tokens.filter((token) => {
    return token.address !== NATIVE_SWAPS_TOKEN_ADDRESS;
  });
  filteredTokens.push(getNativeSwapsToken(chainId));
  return filteredTokens;
}

/**
 * Fetches aggregators metadata from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing aggregators metadata.
 */
export async function fetchAggregatorMetadata(chainId: Hex, clientId?: string) {
  const aggregatorMetadataUrl = getBaseApiURL(
    APIType.AGGREGATOR_METADATA,
    chainId,
  );
  const aggregators: {
    [key: string]: APIAggregatorMetadata;
  } = await handleFetch(aggregatorMetadataUrl, {
    method: 'GET',
    headers: getClientIdHeader(clientId),
  });
  return aggregators;
}

/**
 * Fetches top assets from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing top assets.
 */
export async function fetchTopAssets(
  chainId: Hex,
  clientId?: string,
): Promise<SwapsAsset[]> {
  const topAssetsUrl = getBaseApiURL(APIType.TOP_ASSETS, chainId);
  const response: SwapsAsset[] = await handleFetch(topAssetsUrl, {
    method: 'GET',
    headers: getClientIdHeader(clientId),
  });
  return response;
}

/**
 * Fetches chainId specific feature flags from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing feature flags for the chainId.
 */
export async function fetchSwapsFeatureLiveness(
  chainId: Hex,
  clientId?: string,
): Promise<NetworkFeatureFlags | undefined> {
  const status: NetworksFeatureStatus = await handleFetch(
    getBaseApiURL(APIType.FEATURE_FLAG, chainId),
    { method: 'GET', headers: getClientIdHeader(clientId) },
  );
  const networkName = CHAIN_ID_TO_NAME_MAP[chainId];
  return status[networkName];
}

/**
 * Fetches global and chainId specific feature flags from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Promise resolving to an object containing global and chainId specific feature flags.
 */
export async function fetchSwapsFeatureFlags(
  chainId: Hex,
  clientId?: string,
): Promise<FeatureFlags | undefined> {
  const status: FeatureFlags = await handleFetch(
    getBaseApiURL(APIType.FEATURE_FLAG, chainId),
    { method: 'GET', headers: getClientIdHeader(clientId) },
  );

  return status;
}

/**
 * Fetches gas prices from API URL.
 * @param chainId - Current chainId.
 * @param clientId - Client id.
 * @returns Gas prices represented as decimal GWEI strings.
 */
export async function fetchGasPrices(
  chainId: Hex,
  clientId?: string,
): Promise<{
  safeGasPrice: string;
  proposedGasPrice: string;
  fastGasPrice: string;
}> {
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = await handleFetch(
    getBaseApiURL(APIType.GAS_PRICES, chainId),
    {
      method: 'GET',
      headers: getClientIdHeader(clientId),
    },
  );
  return {
    safeGasPrice: SafeGasPrice,
    proposedGasPrice: ProposeGasPrice,
    fastGasPrice: FastGasPrice,
  };
}

/**
 * Calculates the gas estimate with refund.
 * @param maxGas - The max gas.
 * @param estimatedRefund - The estimated refund.
 * @param estimatedGas - The estimated gas.
 * @returns The gas estimate with refund.
 */
export function calculateGasEstimateWithRefund(
  maxGas: number | null,
  estimatedRefund: number | null,
  estimatedGas: string | null,
): BigNumber {
  const estimated = estimatedGas ? add0x(estimatedGas) : '0x0';
  const maxGasMinusRefund = new BigNumber(maxGas ?? MAX_GAS_LIMIT, 10).minus(
    estimatedRefund ?? 0,
  );
  const estimatedGasBN = new BigNumber(estimated);

  if (maxGasMinusRefund.isLessThan(estimatedGasBN)) {
    return maxGasMinusRefund;
  }
  if (estimated === '0x0') {
    return maxGasMinusRefund;
  }
  return estimatedGasBN;
}

/**
 * Calculates token received from a transaction receipt together with an approval transaction receipt.
 * @param receipt - Swap transaction receipt.
 * @param approvalReceipt - Approval transaction receipt needed for swaps if any.
 * @param transaction - Swap transaction object.
 * @param approvalTransaction - Approval transaction object needed for swaps if any.
 * @param destinationToken - Destination token object.
 * @param previousBalance - Previous swap ETH balance.
 * @param postBalance - Post swap ETH balance.
 * @returns Tokens received in hex minimal unit.
 */
export function getSwapsTokensReceived(
  receipt: TransactionReceipt,
  approvalReceipt: TransactionReceipt | null,
  transaction: TransactionParams,
  approvalTransaction: TransactionParams | null,
  destinationToken: SwapsToken,
  previousBalance: string,
  postBalance: string,
): string | undefined {
  if (destinationToken.address === NATIVE_SWAPS_TOKEN_ADDRESS) {
    const approvalTransactionGasCost = new BigNumber(
      approvalTransaction?.gasPrice ?? '0x0',
    ).times(approvalReceipt?.gasUsed ?? '0x0');
    const transactionGas = new BigNumber(transaction?.gasPrice ?? '0x0').times(
      receipt?.gasUsed ?? '0x0',
    );
    const totalGasCost = transactionGas.plus(approvalTransactionGasCost);

    const previousBalanceMinusGas = new BigNumber(previousBalance).minus(
      totalGasCost,
    );
    const postBalanceMinusGas = new BigNumber(postBalance);

    return postBalanceMinusGas.minus(previousBalanceMinusGas).toString(16);
  }

  if (!receipt?.logs || receipt.status === '0x0') {
    return;
  }

  const tokenTransferLog = receipt.logs.find(
    (receiptLog: { topics: string[]; address: string }) => {
      const isTokenTransfer =
        receiptLog?.topics[0] === TOKEN_TRANSFER_LOG_TOPIC_HASH;
      const isTransferFromGivenToken =
        receiptLog.address === destinationToken.address;
      const isTransferFromGivenAddress = receiptLog?.topics[2]?.match(
        transaction.from.slice(2),
      );
      return (
        isTokenTransfer &&
        isTransferFromGivenToken &&
        isTransferFromGivenAddress
      );
    },
  );
  if (!tokenTransferLog) {
    return;
  }
  return tokenTransferLog.data;
}

/**
 * Calculates the median of a sample of BigNumber values.
 * @param values - A sample of BigNumber values.
 * @returns The median of the sample.
 */
export function getMedian(values: BigNumber[]) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error('Expected non-empty array param.');
  }
  const sorted = [...values].sort((a, b) => a.comparedTo(b));

  if (sorted.length % 2 === 1) {
    // return middle value
    return sorted[(sorted.length - 1) / 2];
  }
  // return mean of middle two values
  const upperIndex = sorted.length / 2;
  return sorted[upperIndex].plus(sorted[upperIndex - 1]).div(2);
}

/**
 * Calculates the median overallValueOfQuote of a sample of quotes.
 * @param quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth, and ethValueOfTokens properties.
 * @returns An object with the ethValueOfTokens, ethFee, and metaMaskFeeInEth of the quote with the median overallValueOfQuote.
 */
export function getMedianEthValueQuote(quotes: QuoteValues[]) {
  if (!Array.isArray(quotes) || quotes.length === 0) {
    throw new Error('Expected non-empty array param.');
  }

  quotes.sort((quoteA, quoteB) => {
    const overallValueOfQuoteA = new BigNumber(quoteA.overallValueOfQuote, 10);
    const overallValueOfQuoteB = new BigNumber(quoteB.overallValueOfQuote, 10);
    return overallValueOfQuoteA.comparedTo(overallValueOfQuoteB);
  });

  if (quotes.length % 2 === 1) {
    // return middle values
    const medianOverallValue =
      quotes[(quotes.length - 1) / 2].overallValueOfQuote;
    const quotesMatchingMedianQuoteValue = quotes.filter(
      (quote) => medianOverallValue === quote.overallValueOfQuote,
    );
    return meansOfQuotesFeesAndValue(quotesMatchingMedianQuoteValue);
  }

  // return mean of middle two values
  const upperIndex = quotes.length / 2;
  const lowerIndex = upperIndex - 1;

  const overallValueAtUpperIndex = quotes[upperIndex].overallValueOfQuote;
  const overallValueAtLowerIndex = quotes[lowerIndex].overallValueOfQuote;

  const quotesMatchingUpperIndexValue = quotes.filter(
    (quote) => overallValueAtUpperIndex === quote.overallValueOfQuote,
  );
  const quotesMatchingLowerIndexValue = quotes.filter(
    (quote) => overallValueAtLowerIndex === quote.overallValueOfQuote,
  );

  const feesAndValueAtUpperIndex = meansOfQuotesFeesAndValue(
    quotesMatchingUpperIndexValue,
  );
  const feesAndValueAtLowerIndex = meansOfQuotesFeesAndValue(
    quotesMatchingLowerIndexValue,
  );

  return {
    ethFee: new BigNumber(feesAndValueAtUpperIndex.ethFee, 10)
      .plus(feesAndValueAtLowerIndex.ethFee, 10)
      .dividedBy(2)
      .toString(10),
    metaMaskFeeInEth: new BigNumber(
      feesAndValueAtUpperIndex.metaMaskFeeInEth,
      10,
    )
      .plus(feesAndValueAtLowerIndex.metaMaskFeeInEth, 10)
      .dividedBy(2)
      .toString(10),
    ethValueOfTokens: new BigNumber(
      feesAndValueAtUpperIndex.ethValueOfTokens,
      10,
    )
      .plus(feesAndValueAtLowerIndex.ethValueOfTokens, 10)
      .dividedBy(2)
      .toString(10),
  };
}

/**
 * Calculates the arithmetic mean for each of three properties - ethFee, metaMaskFeeInEth and ethValueOfTokens - across
 * an array of objects containing those properties.
 * @param quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth and
 * ethValueOfTokens properties.
 * @returns An object with the arithmetic mean each of the ethFee, metaMaskFeeInEth and ethValueOfTokens of
 * the passed quote objects.
 */
function meansOfQuotesFeesAndValue(quotes: QuoteValues[]) {
  const feeAndValueSumsAsBigNumbers = quotes.reduce(
    (feeAndValueSums, quote) => ({
      ethFee: feeAndValueSums.ethFee.plus(quote.ethFee, 10),
      metaMaskFeeInEth: feeAndValueSums.metaMaskFeeInEth.plus(
        quote.metaMaskFeeInEth,
        10,
      ),
      ethValueOfTokens: feeAndValueSums.ethValueOfTokens.plus(
        quote.ethValueOfTokens,
        10,
      ),
    }),
    {
      ethFee: new BigNumber(0, 10),
      metaMaskFeeInEth: new BigNumber(0, 10),
      ethValueOfTokens: new BigNumber(0, 10),
    },
  );

  return {
    ethFee: feeAndValueSumsAsBigNumbers.ethFee
      .div(quotes.length, 10)
      .toString(10),
    metaMaskFeeInEth: feeAndValueSumsAsBigNumbers.metaMaskFeeInEth
      .div(quotes.length, 10)
      .toString(10),
    ethValueOfTokens: feeAndValueSumsAsBigNumbers.ethValueOfTokens
      .div(quotes.length, 10)
      .toString(10),
  };
}

/**
 * Calculates the gas limit and max gas limit for a given transaction.
 * @param approvalNeeded - Whether or not an approval transaction is needed.
 * @param gasEstimateWithRefund - The gas estimate with refund.
 * @param gasEstimate - The gas estimate.
 * @param averageGas - The average gas.
 * @param maxGas - The max gas.
 * @param gasMultiplier - The gas multiplier.
 * @param gasLimit - The gas limit.
 * @returns An object containing the tradeGasLimit and tradeMaxGasLimit.
 */
export function calculateGasLimits(
  approvalNeeded: boolean,
  gasEstimateWithRefund: string | null,
  gasEstimate: string | null,
  averageGas: number,
  maxGas: number,
  gasMultiplier: number,
  gasLimit: string | null,
) {
  let tradeGasLimit, tradeMaxGasLimit;
  const customGasLimit = gasLimit && new BigNumber(gasLimit, 16);
  if (
    !approvalNeeded &&
    gasEstimate &&
    gasEstimateWithRefund &&
    gasEstimateWithRefund !== '0'
  ) {
    tradeGasLimit = new BigNumber(gasEstimateWithRefund, 16);
    tradeMaxGasLimit =
      customGasLimit ??
      new BigNumber(gasEstimate).times(gasMultiplier).integerValue();
  } else {
    tradeGasLimit = new BigNumber(averageGas || MAX_GAS_LIMIT, 10);
    tradeMaxGasLimit =
      customGasLimit ?? new BigNumber(maxGas || MAX_GAS_LIMIT, 10);
  }
  return { tradeGasLimit, tradeMaxGasLimit };
}

/**
 * Calculates the token amount for a given value and decimals.
 * @param value - The value.
 * @param decimals - The decimals.
 * @returns The token amount.
 */
export function calcTokenAmount(value: number | BigNumber, decimals: number) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(value).div(multiplier);
}

/**
 * Estimates required gas for a given transaction.
 * @param transaction - Transaction object to estimate gas for.
 * @param ethQuery - The ethQuery object.
 * @returns Promise resolving to an object containing gas and gasPrice.
 */
export async function estimateGas(
  transaction: Omit<TxParams, 'gas'> & Partial<Pick<TxParams, 'gas'>>,
  ethQuery: EthQuery,
) {
  const estimatedTransaction = { ...transaction };
  const { value, data } = estimatedTransaction;
  const { gasLimit } = await query(ethQuery, 'getBlockByNumber', [
    'latest',
    false,
  ]);
  estimatedTransaction.data = !data
    ? data
    : /* istanbul ignore next */ add0x(data);

  // 3. If this is a contract address, safely estimate gas using RPC
  estimatedTransaction.value =
    typeof value === 'undefined' ? '0x0' : /* istanbul ignore next */ value;
  const gasHex = await query(ethQuery, 'estimateGas', [estimatedTransaction]);
  return { blockGasLimit: gasLimit, gas: add0x(gasHex) };
}

/**
 * Given the standard set of information about a transaction, returns a transaction properly formatted for
 * publishing via JSON RPC and web3.
 * @param txParams - The transaction parameters.
 * @param txParams.sendToken - Indicates whether or not the transaciton is a token transaction.
 * @param txParams.data - A hex string containing the data to include in the transaction.
 * @param txParams.to - A hex address of the tx recipient address.
 * @param txParams.amount - A hex amount, in case of a token tranaction will be set to Tx value.
 * @param txParams.from - A hex address of the tx sender address.
 * @param txParams.gas - A hex representation of the gas value for the transaction.
 * @param txParams.gasPrice - A hex representation of the gas price for the transaction.
 * @returns An object ready for submission to the blockchain, with all values appropriately hex prefixed.
 */
export function constructTxParams({
  sendToken,
  data,
  to,
  amount,
  from,
  gas,
  gasPrice,
}: {
  sendToken?: boolean;
  data?: string;
  to?: string;
  from: string;
  gas?: string;
  gasPrice?: string;
  amount?: string;
}): Pick<TransactionParams, keyof typeof TX_NORMALIZERS> {
  const txParams: TransactionParams = {
    data,
    from,
    value: '0',
    gas,
    gasPrice,
  };

  if (!sendToken) {
    txParams.value = amount;
    txParams.to = to;
  }
  return normalizeTransaction(txParams);
}

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
export function isGasFeeStateFeeMarket(
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

/**
 * Determines if the given object is of type EthGasPriceEstimate.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type EthGasPriceEstimate.
 */
export function isEthGasPriceEstimate(
  object: Record<string, unknown> | undefined,
): object is EthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

/**
 * Determines if the given object is of type CustomEthGasPriceEstimate.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type CustomEthGasPriceEstimate.
 */
export function isCustomEthGasPriceEstimate(
  object: Record<string, unknown> | undefined,
): object is CustomEthGasPriceEstimate {
  return Boolean(object) && object?.gasPrice !== undefined;
}

/**
 * Determines if the given object is of type CustomGasFee.
 * @param object - The object to be evaluated.
 * @returns Whether the object is of type CustomGasFee.
 */
export function isCustomGasFee(
  object: Record<string, unknown> | undefined,
): object is CustomGasFee {
  return (
    object !== undefined &&
    Boolean(object) &&
    'maxFeePerGas' in object &&
    'maxPriorityFeePerGas' in object
  );
}

/**
 * Gets a new chainCache for a chainId with updated data.
 * @param chainCache - Current chainCache from state.
 * @param chainId - Current chainId from the config.
 * @param data - Data to be updated.
 * @returns The new chainCache.
 */
export function getNewChainCache(
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
