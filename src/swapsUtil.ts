import { Transaction, util } from '@metamask/controllers';
import { AbortSignal } from 'abort-controller';
import { BigNumber } from 'bignumber.js';
import { addHexPrefix } from 'ethereumjs-util';
import {
  APIAggregatorMetadata,
  SwapsAsset,
  SwapsToken,
  APIType,
  Quote,
  APIFetchQuotesParams,
  QuoteValues,
  TransactionReceipt,
} from './swapsInterfaces';

const {
  handleFetch,
  timeoutFetch,
  BNToHex,
  query,
  normalizeTransaction,
} = util;

export const ETH_CHAIN_ID = '1';
export const BSC_CHAIN_ID = '56';
export const SWAPS_TESTNET_CHAIN_ID = '1337';

export const ETH_SWAPS_CONTRACT_ADDRESS =
  '0x881d40237659c251811cec9c364ef91dc08d300c';
export const BSC_SWAPS_CONTRACT_ADDRESS =
  '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31';
export const WETH_CONTRACT_ADDRESS =
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

export const SWAPS_CONTRACT_ADDRESSES: { [key: string]: string } = {
  [ETH_CHAIN_ID]: ETH_SWAPS_CONTRACT_ADDRESS,
  [SWAPS_TESTNET_CHAIN_ID]: ETH_SWAPS_CONTRACT_ADDRESS,
  [BSC_CHAIN_ID]: BSC_SWAPS_CONTRACT_ADDRESS,
};

export const ALLOWED_CONTRACT_ADDRESSES: { [key: string]: string[] } = {
  [ETH_CHAIN_ID]: [
    SWAPS_CONTRACT_ADDRESSES[ETH_CHAIN_ID],
    WETH_CONTRACT_ADDRESS,
  ],
  [SWAPS_TESTNET_CHAIN_ID]: [
    SWAPS_CONTRACT_ADDRESSES[SWAPS_TESTNET_CHAIN_ID],
    WETH_CONTRACT_ADDRESS,
  ],
  [BSC_CHAIN_ID]: [SWAPS_CONTRACT_ADDRESSES[BSC_CHAIN_ID]],
};

export const NATIVE_SWAPS_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';
const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const ETH_SWAPS_TOKEN_OBJECT: SwapsToken = {
  symbol: 'ETH',
  name: 'Ether',
  address: NATIVE_SWAPS_TOKEN_ADDRESS,
  decimals: 18,
};

export const BSC_SWAPS_TOKEN_OBJECT: SwapsToken = {
  symbol: 'BNB',
  name: 'Binance Coin',
  address: NATIVE_SWAPS_TOKEN_ADDRESS,
  decimals: 18,
};

const SWAPS_NATIVE_TOKEN_OBJECTS: { [key: string]: SwapsToken } = {
  [ETH_CHAIN_ID]: ETH_SWAPS_TOKEN_OBJECT,
  [SWAPS_TESTNET_CHAIN_ID]: ETH_SWAPS_TOKEN_OBJECT,
  [BSC_CHAIN_ID]: BSC_SWAPS_TOKEN_OBJECT,
};

const API_BASE_HOST_URL: { [key: string]: string } = {
  [ETH_CHAIN_ID]: 'https://api.metaswap.codefi.network',
  [SWAPS_TESTNET_CHAIN_ID]: 'https://metaswap-api.airswap-dev.codefi.network',
  [BSC_CHAIN_ID]: 'https://bsc-api.metaswap.codefi.network',
};

export const DEFAULT_ERC20_APPROVE_GAS = '0x1d4c0';

// The MAX_GAS_LIMIT is a number that is higher than the maximum gas costs we have observed on any aggregator
const MAX_GAS_LIMIT = 2500000;

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

// Functions

export function getNativeSwapsToken(chainId: string): SwapsToken {
  return SWAPS_NATIVE_TOKEN_OBJECTS[chainId];
}

export function getSwapsContractAddress(chainId: string): string {
  return SWAPS_CONTRACT_ADDRESSES[chainId];
}

export function isValidContractAddress(
  chainId: string,
  contract: string | undefined,
): boolean {
  if (!contract) {
    return false;
  }
  return ALLOWED_CONTRACT_ADDRESSES[chainId].some(
    (allowedContract) => contract === allowedContract,
  );
}

export const getBaseApiURL = function (type: APIType, chainId: string): string {
  const hostURL = API_BASE_HOST_URL[chainId];
  switch (type) {
    case APIType.TRADES:
      return `${hostURL}/trades`;
    case APIType.TOKENS:
      return `${hostURL}/tokens`;
    case APIType.TOP_ASSETS:
      return `${hostURL}/topAssets`;
    case APIType.FEATURE_FLAG:
      return `${hostURL}/featureFlag`;
    case APIType.AGGREGATOR_METADATA:
      return `${hostURL}/aggregatorMetadata`;
    case APIType.GAS_PRICES:
      return `${hostURL}/gasPrices`;
    default:
      throw new Error('getBaseApiURL requires an api call type');
  }
};

export async function fetchTradesInfo(
  {
    slippage,
    sourceToken,
    sourceAmount,
    destinationToken,
    walletAddress,
  }: APIFetchQuotesParams,
  abortSignal: AbortSignal | null,
  chainId: string,
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

  const tradeURL = `${getBaseApiURL(
    APIType.TRADES,
    chainId,
  )}?${new URLSearchParams(urlParams as Record<any, any>).toString()}`;

  const tradesResponse = await timeoutFetch(
    tradeURL,
    { method: 'GET', signal: abortSignal },
    15000,
  );
  const trades = (await tradesResponse.json()) as Quote[];
  const newQuotes = trades.reduce(
    (aggIdTradeMap: { [key: string]: Quote }, quote: Quote) => {
      if (
        !quote.error &&
        quote.trade &&
        isValidContractAddress(chainId, quote.trade?.to?.toLowerCase())
      ) {
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
    },
    {},
  );

  return newQuotes;
}

export async function fetchTokens(chainId: string): Promise<SwapsToken[]> {
  const tokenUrl = getBaseApiURL(APIType.TOKENS, chainId);
  const tokens: SwapsToken[] = await handleFetch(tokenUrl, { method: 'GET' });
  const filteredTokens = tokens.filter((token) => {
    return token.address !== NATIVE_SWAPS_TOKEN_ADDRESS;
  });
  filteredTokens.push(getNativeSwapsToken(chainId));
  return filteredTokens;
}

export async function fetchAggregatorMetadata(chainId: string) {
  const aggregatorMetadataUrl = getBaseApiURL(
    APIType.AGGREGATOR_METADATA,
    chainId,
  );
  const aggregators: {
    [key: string]: APIAggregatorMetadata;
  } = await handleFetch(aggregatorMetadataUrl, {
    method: 'GET',
  });
  return aggregators;
}

export async function fetchTopAssets(chainId: string): Promise<SwapsAsset[]> {
  const topAssetsUrl = getBaseApiURL(APIType.TOP_ASSETS, chainId);
  const response: SwapsAsset[] = await handleFetch(topAssetsUrl, {
    method: 'GET',
  });
  return response;
}

export async function fetchSwapsFeatureLiveness(
  chainId: string,
): Promise<boolean> {
  try {
    const status = await handleFetch(
      getBaseApiURL(APIType.FEATURE_FLAG, chainId),
      { method: 'GET' },
    );
    return status;
  } catch (err) {
    return false;
  }
}

/**
 * Fetches gas prices from API URL
 * @param chainId Current chainId
 * @returns Gas prices represented as decimal GWEI strings
 */
export async function fetchGasPrices(
  chainId: string,
): Promise<{
  safeGasPrice: string;
  proposedGasPrice: string;
  fastGasPrice: string;
}> {
  const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = await handleFetch(
    getBaseApiURL(APIType.GAS_PRICES, chainId),
    {
      method: 'GET',
    },
  );
  return {
    safeGasPrice: SafeGasPrice,
    proposedGasPrice: ProposeGasPrice,
    fastGasPrice: FastGasPrice,
  };
}

export function calculateGasEstimateWithRefund(
  maxGas: number | null,
  estimatedRefund: number | null,
  estimatedGas: string | null,
): BigNumber {
  const estimated = estimatedGas && addHexPrefix(estimatedGas);
  const maxGasMinusRefund = new BigNumber(maxGas || MAX_GAS_LIMIT, 10).minus(
    estimatedRefund || 0,
  );
  const estimatedGasBN = new BigNumber(estimated || '0x0');
  const gasEstimateWithRefund = maxGasMinusRefund.lt(estimatedGasBN)
    ? maxGasMinusRefund
    : estimatedGasBN;
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
  postBalance: string,
): string | undefined {
  if (destinationToken.address === NATIVE_SWAPS_TOKEN_ADDRESS) {
    const approvalTransactionGasCost = new BigNumber(
      approvalTransaction?.gasPrice || '0x0',
    ).times(approvalReceipt?.gasUsed || '0x0');
    const transactionGas = new BigNumber(transaction?.gasPrice || '0x0').times(
      receipt?.gasUsed || '0x0',
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
      customGasLimit ||
      new BigNumber(gasEstimate).times(gasMultiplier).integerValue();
  } else {
    tradeGasLimit = new BigNumber(averageGas || MAX_GAS_LIMIT, 10);
    tradeMaxGasLimit =
      customGasLimit || new BigNumber(maxGas || MAX_GAS_LIMIT, 10);
  }
  return { tradeGasLimit, tradeMaxGasLimit };
}

export function calcTokenAmount(value: number | BigNumber, decimals: number) {
  const multiplier = Math.pow(10, Number(decimals || 0));
  return new BigNumber(value).div(multiplier);
}

/**
 * Estimates required gas for a given transaction
 *
 * @param transaction - Transaction object to estimate gas for
 * @returns - Promise resolving to an object containing gas and gasPrice
 */
export async function estimateGas(transaction: Transaction, ethQuery: any) {
  const estimatedTransaction = { ...transaction };
  const { value, data } = estimatedTransaction;
  const { gasLimit } = await query(ethQuery, 'getBlockByNumber', [
    'latest',
    false,
  ]);
  estimatedTransaction.data = !data
    ? data
    : /* istanbul ignore next */ addHexPrefix(data);
  // 3. If this is a contract address, safely estimate gas using RPC
  estimatedTransaction.value =
    typeof value === 'undefined' ? '0x0' : /* istanbul ignore next */ value;
  const gasHex = await query(ethQuery, 'estimateGas', [estimatedTransaction]);
  return { blockGasLimit: gasLimit, gas: addHexPrefix(gasHex) };
}

/**
 * Given the standard set of information about a transaction, returns a transaction properly formatted for
 * publishing via JSON RPC and web3
 *
 * @param {boolean} [sendToken] - Indicates whether or not the transaciton is a token transaction
 * @param {string} data - A hex string containing the data to include in the transaction
 * @param {string} to - A hex address of the tx recipient address
 * @param {string} amount - A hex amount, in case of a token tranaction will be set to Tx value
 * @param {string} from - A hex address of the tx sender address
 * @param {string} gas - A hex representation of the gas value for the transaction
 * @param {string} gasPrice - A hex representation of the gas price for the transaction
 * @returns {object} An object ready for submission to the blockchain, with all values appropriately hex prefixed
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
}): any {
  const txParams: Transaction = {
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
