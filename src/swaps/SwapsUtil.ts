import BigNumber from 'bignumber.js';
import { Transaction } from '../transaction/TransactionController';
import { handleFetch, timeoutFetch, constructTxParams, BNToHex } from '../util';
import {
  APIAggregatorMetadata,
  SwapsAsset,
  SwapsToken,
  APIType,
  Quote,
  APIFetchQuotesParams,
  QuoteValues,
} from './SwapsInterfaces';

export const ETH_SWAPS_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';
const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

  /**
 * Metadata needed to fetch quotes
 *
 * @interface APIFetchQuotesMetadata
 *
 * @property blockHash - Hash of the block where this transaction was in
 * @property blockNumber - Block number where this transaction was in
 * @property transactionHash - Hash of the transaction
 * @property transactionIndex - Integer of the transactions index position in the block
 * @property from - Address of the sender
 * @property to - Address of the receiver. null when its a contract creation transaction
 * @property cumulativeGasUsed - The total amount of gas used when this transaction was executed in the block
 * @property gasUsed - The amount of gas used by this specific transaction alone
 * @property contractAddress - The contract address created, if the transaction was a contract creation, otherwise null
 * @property logs - Array of log objects, which this transaction generate
 * @property status - '0x0' indicates transaction failure , '0x1' indicates transaction succeeded.
 *
 */
export interface TransactionReceipt {
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  contractAddress: string;
  logs: {data: string; topics: string[]; address: string}[];
  status: string;
}

export const ETH_SWAPS_TOKEN_OBJECT: SwapsToken = {
  symbol: 'ETH',
  name: 'Ether',
  address: ETH_SWAPS_TOKEN_ADDRESS,
  decimals: 18,
};

export const DEFAULT_ERC20_APPROVE_GAS = '0x1d4c0';

// The MAX_GAS_LIMIT is a number that is higher than the maximum gas costs we have observed on any aggregator
const MAX_GAS_LIMIT = 2500000;

export const SWAPS_CONTRACT_ADDRESS = '0x881d40237659c251811cec9c364ef91dc08d300c';

export enum SwapsError {
  QUOTES_EXPIRED_ERROR = 'quotes-expired',
  SWAP_FAILED_ERROR = 'swap-failed-error',
  ERROR_FETCHING_QUOTES = 'error-fetching-quotes',
  QUOTES_NOT_AVAILABLE_ERROR = 'quotes-not-available',
  OFFLINE_FOR_MAINTENANCE = 'offline-for-maintenance',
  SWAPS_FETCH_ORDER_CONFLICT = 'swaps-fetch-order-conflict',
}

// Functions

export const getBaseApiURL = function (type: APIType): string {
  switch (type) {
    case APIType.TRADES:
      return 'https://api.metaswap.codefi.network/trades';
    case APIType.TOKENS:
      return 'https://api.metaswap.codefi.network/tokens';
    case APIType.TOP_ASSETS:
      return 'https://api.metaswap.codefi.network/topAssets';
    case APIType.FEATURE_FLAG:
      return 'https://api.metaswap.codefi.network/featureFlag';
    case APIType.AGGREGATOR_METADATA:
      return 'https://api.metaswap.codefi.network/aggregatorMetadata';
    case APIType.GAS_PRICES:
      return 'https://api.metaswap.codefi.network/gasPrices';
    default:
      throw new Error('getBaseApiURL requires an api call type');
  }
};

export async function fetchTradesInfo(
  { slippage, sourceToken, sourceAmount, destinationToken, walletAddress, exchangeList }: APIFetchQuotesParams,
  abortSignal: AbortSignal | null,
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

  if (exchangeList) {
    urlParams.exchangeList = exchangeList;
  }

  if (clientId) {
    urlParams.clientId = clientId;
  }

  const tradeURL = `${getBaseApiURL(APIType.TRADES)}?${new URLSearchParams(urlParams as Record<any, any>).toString()}`;

  const tradesResponse = (await timeoutFetch(tradeURL, { method: 'GET', signal: abortSignal }, 15000)) as Quote[];
  const newQuotes = tradesResponse.reduce((aggIdTradeMap: { [key: string]: Quote }, quote: Quote) => {
    if (!quote.error && quote.trade && quote.trade?.to?.toLowerCase() === SWAPS_CONTRACT_ADDRESS) {
      const constructedTrade = constructTxParams({
        to: quote.trade.to,
        from: quote.trade.from,
        data: quote.trade.data,
        amount: BNToHex(new BigNumber(quote.trade.value)),
        gas: BNToHex(quote.maxGas),
      });

      return {
        ...aggIdTradeMap,
        [quote.aggregator]: {
          ...quote,
          slippage,
          trade: constructedTrade,
        },
      };
    }

    return aggIdTradeMap;
  }, {});

  return newQuotes;
}

export async function fetchTokens(): Promise<SwapsToken[]> {
  const tokenUrl = getBaseApiURL(APIType.TOKENS);
  const tokens: SwapsToken[] = await handleFetch(tokenUrl, { method: 'GET' });
  const filteredTokens = tokens.filter((token) => {
    return token.address !== ETH_SWAPS_TOKEN_ADDRESS;
  });
  filteredTokens.push(ETH_SWAPS_TOKEN_OBJECT);
  return filteredTokens;
}

export async function fetchAggregatorMetadata() {
  const aggregatorMetadataUrl = getBaseApiURL(APIType.AGGREGATOR_METADATA);
  const aggregators: { [key: string]: APIAggregatorMetadata } = await handleFetch(aggregatorMetadataUrl, {
    method: 'GET',
  });
  return aggregators;
}

export async function fetchTopAssets(): Promise<SwapsAsset[]> {
  const topAssetsUrl = getBaseApiURL(APIType.TOP_ASSETS);
  const response: SwapsAsset[] = await handleFetch(topAssetsUrl, { method: 'GET' });
  return response;
}

export async function fetchSwapsFeatureLiveness(): Promise<boolean> {
  try {
    const status = await handleFetch(getBaseApiURL(APIType.FEATURE_FLAG), { method: 'GET' });
    return status;
  } catch (err) {
    return false;
  }
}

export async function fetchTokenPrice(address: string): Promise<string> {
  const query = `contract_addresses=${address}&vs_currencies=eth`;
  const prices = await handleFetch(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?${query}`, {
    method: 'GET',
  });
  return prices && prices[address]?.eth;
}

export async function fetchGasPrices(): Promise<{
  SafeGasPrice: string;
  ProposeGasPrice: string;
  FastGasPrice: string;
}> {
  const prices = await handleFetch(getBaseApiURL(APIType.GAS_PRICES), {
    method: 'GET',
  });
  return prices;
}

export function calculateGasEstimateWithRefund(
  maxGas: number | null,
  estimatedRefund: number | null,
  estimatedGas: string | null,
): BigNumber {
  const maxGasMinusRefund = new BigNumber(maxGas || MAX_GAS_LIMIT, 10).minus(estimatedRefund || 0);
  const estimatedGasBN = new BigNumber(estimatedGas || '0');
  const gasEstimateWithRefund = maxGasMinusRefund.lt(estimatedGasBN) ? maxGasMinusRefund : estimatedGasBN;
  return gasEstimateWithRefund;
}

/**
 * Calculates token received from a transaction receipt together with an approval transaction receipt
 *
 * @param receipt - Swap transaction receipt
 * @param approvalReceipt - Approval transaction receipt needed for swaps if any
 * @param transaction - Swap transaction object
 * @param approvalTransaction - Approval transaction object needed for swaps if any
 * @param destinationToken - Destination token object
 * @param previousBalance - Previous swap ETH balance
 * @param postBalance - Post swap ETH balance
 * @returns - Tokens received in hex minimal unit
 */
export function getSwapsTokensReceived(
  receipt: TransactionReceipt,
  approvalReceipt: TransactionReceipt | null,
  transaction: Transaction,
  approvalTransaction: Transaction,
  destinationToken: SwapsToken,
  previousBalance: string,
  postBalance: string
): string | undefined {
  if (destinationToken.address === ETH_SWAPS_TOKEN_ADDRESS) {
    const approvalTransactionGasCost = new BigNumber(approvalTransaction?.gasPrice || '0x0').times(approvalReceipt?.gasUsed || '0x0');
    const transactionGas = new BigNumber(transaction?.gasPrice || '0x0').times(receipt?.gasUsed || '0x0');
    const totalGasCost = transactionGas.plus(approvalTransactionGasCost);

    const previousBalanceMinusGas = new BigNumber(previousBalance).minus(totalGasCost);
    const postBalanceMinusGas = new BigNumber(postBalance);

    return postBalanceMinusGas.minus(previousBalanceMinusGas).toString(16);
  }
  if (!receipt?.logs || receipt.status === '0x0') {
    return;
  }

  const tokenTransferLog = receipt.logs.find((receiptLog: {topics: string[]; address: string}) => {
    const isTokenTransfer = receiptLog?.topics[0] === TOKEN_TRANSFER_LOG_TOPIC_HASH;
    const isTransferFromGivenToken = receiptLog.address === destinationToken.address;
    const isTransferFromGivenAddress = receiptLog?.topics[2]?.match(transaction.from.slice(2));
    return (
      isTokenTransfer &&
      isTransferFromGivenToken &&
      isTransferFromGivenAddress
    );
  });
  if (!tokenTransferLog) {
    return;
  }
  return tokenTransferLog.data;
}

/**
 * Calculates the median of a sample of BigNumber values.
 *
 * @param {BigNumber[]} values - A sample of BigNumber values.
 * @returns {BigNumber} The median of the sample.
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
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth, and ethValueOfTokens properties
 * @returns {Object} An object with the ethValueOfTokens, ethFee, and metaMaskFeeInEth of the quote with the median overallValueOfQuote
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
    const medianOverallValue = quotes[(quotes.length - 1) / 2].overallValueOfQuote;
    const quotesMatchingMedianQuoteValue = quotes.filter((quote) => medianOverallValue === quote.overallValueOfQuote);
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

  const feesAndValueAtUpperIndex = meansOfQuotesFeesAndValue(quotesMatchingUpperIndexValue);
  const feesAndValueAtLowerIndex = meansOfQuotesFeesAndValue(quotesMatchingLowerIndexValue);

  return {
    ethFee: new BigNumber(feesAndValueAtUpperIndex.ethFee, 10)
      .plus(feesAndValueAtLowerIndex.ethFee, 10)
      .dividedBy(2)
      .toString(10),
    metaMaskFeeInEth: new BigNumber(feesAndValueAtUpperIndex.metaMaskFeeInEth, 10)
      .plus(feesAndValueAtLowerIndex.metaMaskFeeInEth, 10)
      .dividedBy(2)
      .toString(10),
    ethValueOfTokens: new BigNumber(feesAndValueAtUpperIndex.ethValueOfTokens, 10)
      .plus(feesAndValueAtLowerIndex.ethValueOfTokens, 10)
      .dividedBy(2)
      .toString(10),
  };
}

/**
 * Calculates the arithmetic mean for each of three properties - ethFee, metaMaskFeeInEth and ethValueOfTokens - across
 * an array of objects containing those properties.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth and
 * ethValueOfTokens properties
 * @returns {Object} An object with the arithmetic mean each of the ethFee, metaMaskFeeInEth and ethValueOfTokens of
 * the passed quote objects
 */
function meansOfQuotesFeesAndValue(quotes: QuoteValues[]) {
  const feeAndValueSumsAsBigNumbers = quotes.reduce(
    (feeAndValueSums, quote) => ({
      ethFee: feeAndValueSums.ethFee.plus(quote.ethFee, 10),
      metaMaskFeeInEth: feeAndValueSums.metaMaskFeeInEth.plus(quote.metaMaskFeeInEth, 10),
      ethValueOfTokens: feeAndValueSums.ethValueOfTokens.plus(quote.ethValueOfTokens, 10),
    }),
    {
      ethFee: new BigNumber(0, 10),
      metaMaskFeeInEth: new BigNumber(0, 10),
      ethValueOfTokens: new BigNumber(0, 10),
    },
  );

  return {
    ethFee: feeAndValueSumsAsBigNumbers.ethFee.div(quotes.length, 10).toString(10),
    metaMaskFeeInEth: feeAndValueSumsAsBigNumbers.metaMaskFeeInEth.div(quotes.length, 10).toString(10),
    ethValueOfTokens: feeAndValueSumsAsBigNumbers.ethValueOfTokens.div(quotes.length, 10).toString(10),
  };
}

export function calculateGasLimits(approvalNeeded: boolean, gasEstimateWithRefund: string | null, averageGas: number, maxGas: number, gasMultiplier: number) {
  let tradeGasLimit, tradeMaxGasLimit;
  if (!approvalNeeded && gasEstimateWithRefund && gasEstimateWithRefund !== '0') {
    tradeGasLimit = new BigNumber(gasEstimateWithRefund, 16);
    tradeMaxGasLimit = tradeGasLimit.times(gasMultiplier);
  } else {
    tradeGasLimit = new BigNumber(averageGas || MAX_GAS_LIMIT, 10);
    tradeMaxGasLimit = new BigNumber(maxGas || MAX_GAS_LIMIT, 10);
  }
  return { tradeGasLimit, tradeMaxGasLimit };
}
