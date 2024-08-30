import type { TransactionParams } from '@metamask/transaction-controller';
import type { BigNumber } from 'bignumber.js';

export enum APIType {
  TRADES = 'TRADES',
  TOKENS = 'TOKENS',
  TOP_ASSETS = 'TOP_ASSETS',
  FEATURE_FLAG = 'FEATURE_FLAG',
  AGGREGATOR_METADATA = 'AGGREGATOR_METADATA',
  TOKEN = 'TOKEN',
  GAS_PRICES = 'GAS_PRICES',
}

export type SwapsAsset = {
  address: string;
  symbol: string;
  name?: string;
};

export type SwapsToken = {
  decimals: number;
  occurrences?: number;
  iconUrl?: string;
} & SwapsAsset;

export type NetworkFeatureFlags = {
  mobile_active: boolean;
  extension_active: boolean;
  fallback_to_v1?: boolean;
};

export type NetworksFeatureStatus = {
  [network: string]: NetworkFeatureFlags;
};

export type NetworkFeatureFlagsAll = {
  mobile_active: boolean;
  extension_active: boolean;
  fallback_to_v1?: boolean;
  fallbackToV1: boolean;
  mobileActive: boolean;
  extensionActive: boolean;
  mobileActiveIOS: boolean;
  mobileActiveAndroid: boolean;

  smartTransactions: {
    expectedDeadline: number;
    maxDeadline: number;
    returnTxHashAsap: boolean;
  };
};

export type NetworksFeatureStatusAll = {
  [network: string]: NetworkFeatureFlagsAll;
};

export type GlobalFeatureFlags = {
  smart_transactions: {
    mobile_active: boolean;
    extension_active: boolean;
  };
  smartTransactions: {
    mobileActive: boolean;
    extensionActive: boolean;
    mobileActiveIOS: boolean;
    mobileActiveAndroid: boolean;
  };
};

export type FeatureFlags = NetworksFeatureStatusAll & GlobalFeatureFlags;

/**
 * Metadata needed to fetch quotes
 * @interface APIFetchQuotesMetadata
 * @property sourceTokenInfo - Source token information
 * @property destinationTokenInfo - Destination token information
 */
export type APIFetchQuotesMetadata = {
  sourceTokenInfo: SwapsToken;
  destinationTokenInfo: SwapsToken;
};

/**
 * Parameters needed to fetch quotes
 * @interface APIFetchQuotesParams
 * @property slippage - Slippage
 * @property sourceToken - Source token address
 * @property sourceAmount - Source token amount
 * @property destinationToken - Destination token address
 * @property walletAddress - Address to do the swap from
 * @property timeout - Timeout
 * @property clientId - Client id
 * @property enableDirectWrapping - Enable direct wrapping
 */
export type APIFetchQuotesParams = {
  slippage: number;
  sourceToken: string;
  sourceAmount: number;
  destinationToken: string;
  walletAddress: string;
  timeout?: number;
  clientId?: string;
  enableDirectWrapping?: boolean;
};

/**
 * Aggregator metadata coming from API
 * @interface APIAggregatorMetadata
 */
export type APIAggregatorMetadata = {
  color: string;
  title: string;
  icon: string;
  iconPng: string;
};

type QuoteTransaction = {
  value: string;
} & TransactionParams;

/**
 * Savings of a quote
 * @interface QuoteSavings
 */
export type QuoteSavings = {
  total: BigNumber;
  performance: BigNumber;
  fee: BigNumber;
  medianMetaMaskFee: BigNumber;
};

/**
 * Represents trade data structure coming from an API, which includes details about the trade, savings, gas estimations, and additional related information.
 * @interface Quote
 * @property {QuoteTransaction} trade - The Ethereum transaction data for the swap.
 * @property {object|null} approvalNeeded - Ethereum transaction details required to complete an ERC20 token approval, if necessary.
 * @property {string} sourceAmount - The amount of the source token in its minimal unit to send.
 * @property {number} destinationAmount - The amount of the destination token in its minimal unit to receive.
 * @property {Error|null} error - Any trade error that occurred, if any.
 * @property {string} sourceToken - The address of the source token.
 * @property {string} destinationToken - The address of the destination token.
 * @property {number} maxGas - The maximum gas limit for the transaction.
 * @property {number} averageGas - The average gas used for similar transactions.
 * @property {number} estimatedRefund - Estimated refund in the destination token.
 * @property {number} fetchTime - The time when the quote was fetched.
 * @property {number} fee - The MetaMask fee for the transaction.
 * @property {number} quoteRefreshSeconds - The time interval in seconds to refresh the quote.
 * @property {number} gasMultiplier - A multiplier applied to the gas estimate.
 * @property {string} aggregator - The identifier of the aggregator used.
 * @property {string} aggType - The type of aggregator.
 * @property {object} priceSlippage - Information about the price slippage.
 * @property {QuoteSavings|null} savings - An estimation of savings for this trade.
 * @property {string|null} gasEstimate - Estimated gas for the transaction.
 * @property {string|null} gasEstimateWithRefund - Estimated gas for the transaction including any refund.
 * @property {number|null} destinationTokenRate - The exchange rate for the destination token.
 * @property {number|null} sourceTokenRate - The exchange rate for the source token.
 * @property {string|undefined} multiLayerL1TradeFeeTotal - Total trade fee for multi-layer L1 trades, if applicable.
 */
export type Quote = {
  trade: QuoteTransaction;
  approvalNeeded: null | {
    data: string;
    to: string;
    from: string;
    gas: string;
  };
  sourceAmount: string;
  destinationAmount: number;
  error: null | Error;
  sourceToken: string;
  destinationToken: string;
  maxGas: number;
  averageGas: number;
  estimatedRefund: number;
  fetchTime: number;
  aggregator: string;
  aggType: string;
  fee: number;
  quoteRefreshSeconds: number;
  gasMultiplier: number;
  savings: QuoteSavings | null;
  gasEstimate: string | null;
  gasEstimateWithRefund: string | null;
  destinationTokenRate: number | null;
  sourceTokenRate: number | null;
  multiLayerL1TradeFeeTotal: string | undefined;
};

/**
 * Represents fees and value-related information for a trade operation, specifically in the context of an aggregator.
 * @interface QuoteValues
 * @property {string} aggregator - The identifier of the aggregator.
 * @property {string} tradeGasLimit - The gas limit for the trade transaction.
 * @property {string} tradeMaxGasLimit - The maximum gas limit that can be used for the trade.
 * @property {string} ethFee - The fee for the transaction in ETH.
 * @property {string} maxEthFee - The maximum possible fee for the transaction in ETH.
 * @property {string} ethValueOfTokens - The total value of the tokens involved in the trade, denominated in ETH.
 * @property {string} overallValueOfQuote - The overall value of the quote, including all fees and values.
 * @property {string} metaMaskFeeInEth - The fee charged by MetaMask for processing the transaction, denominated in ETH.
 */
export type QuoteValues = {
  aggregator: string;
  tradeGasLimit: string;
  tradeMaxGasLimit: string;
  ethFee: string;
  maxEthFee: string;
  ethValueOfTokens: string;
  overallValueOfQuote: string;
  metaMaskFeeInEth: string;
};

/**
 * Represents the metadata associated with a blockchain transaction receipt, detailing various aspects of the transaction's processing and execution.
 * @interface TransactionReceipt
 * @property {string} blockHash - The hash of the block in which this transaction was included.
 * @property {number} blockNumber - The number of the block in which this transaction was included.
 * @property {string} transactionHash - The unique hash of the transaction.
 * @property {number} transactionIndex - The index position of the transaction in the block.
 * @property {string} from - The address of the sender who initiated the transaction.
 * @property {string|null} to - The address of the receiver. This is null when it's a contract creation transaction.
 * @property {number} cumulativeGasUsed - The total amount of gas used by all transactions in the block up to and including this one.
 * @property {number} gasUsed - The amount of gas used by this specific transaction.
 * @property {string|null} contractAddress - The address of the contract created, if this transaction was a contract creation; otherwise null.
 * @property {Array} logs - An array of log objects generated by this transaction, containing event data and topics.
 * @property {string} status - The status of the transaction, where '0x0' indicates failure and '0x1' indicates success.
 */
export type TransactionReceipt = {
  blockHash: string;
  blockNumber: number;
  transactionHash: string;
  transactionIndex: number;
  from: string;
  to: string;
  cumulativeGasUsed: number;
  gasUsed: number;
  contractAddress: string;
  logs: { data: string; topics: string[]; address: string }[];
  status: string;
};

export type ChainData = {
  aggregatorMetadata: null | { [key: string]: APIAggregatorMetadata };
  tokens: null | SwapsToken[];
  topAssets: null | SwapsAsset[];
  aggregatorMetadataLastFetched: number;
  tokensLastFetched: number;
  topAssetsLastFetched: number;
};

export type ChainCache = {
  [key: string]: ChainData;
};
