import type { Web3Provider } from '@ethersproject/providers';
import type { AccessList } from '@ethereumjs/tx';
import type {
  RestrictedControllerMessenger,
  ControllerStateChangeEvent,
  ControllerGetStateAction,
} from '@metamask/base-controller';
import type EthQuery from '@metamask/eth-query';
import type {
  EthGasPriceEstimate,
  GasFeeController,
  GasFeeEstimates,
} from '@metamask/gas-fee-controller';
import type {
  NetworkClient,
  NetworkClientId,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import type { Hex, JsonRpcError } from '@metamask/utils';

import type SwapsController from './SwapsController';
import type { controllerName, SwapsError } from './swapsUtil';

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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  mobile_active: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  extension_active: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  fallback_to_v1?: boolean;
};

export type NetworksFeatureStatus = {
  [network: string]: NetworkFeatureFlags;
};

export type NetworkFeatureFlagsAll = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  mobile_active: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  extension_active: boolean;
  // eslint-disable-next-line @typescript-eslint/naming-convention
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
  smart_transactions: {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    mobile_active: boolean;
    // eslint-disable-next-line @typescript-eslint/naming-convention
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
 * @property networkClientId - The network on which to fetch quotes in the form
 * of a NetworkController network client ID.
 */
export type APIFetchQuotesMetadata = {
  sourceTokenInfo: SwapsToken;
  destinationTokenInfo: SwapsToken;
  networkClientId: NetworkClientId;
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
} & TxParams;

/**
 * Savings of a quote
 * @interface QuoteSavings
 */
export type QuoteSavings = {
  total: string;
  performance: string;
  fee: string;
  medianMetaMaskFee: string;
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
  approvalNeeded: TxParams | null;
  sourceAmount: string;
  destinationAmount: number;
  error: JsonRpcError | null;
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
  multiLayerL1TradeFeeTotal: string | null;
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

export type TxParams = {
  from: string;
  to: string;
  value?: string;
  data?: string;
  gas: string;
  gasPrice?: string;
  nonce?: string;
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

// Custom types for custom gas values
export type CustomEthGasPriceEstimate = {
  gasPrice: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
};

export type CustomGasFee = {
  maxFeePerGas: string; // a GWEI dec string
  maxPriorityFeePerGas: string; // a GWEI dec string
  estimatedBaseFee?: string; // a GWEI dec string
  selected?: 'low' | 'medium' | 'high';
};

export type SwapsControllerState = {
  quotes: { [key: string]: Quote };
  fetchParams: APIFetchQuotesParams;
  fetchParamsMetaData: APIFetchQuotesMetadata;
  topAggSavings: QuoteSavings | null;
  quotesLastFetched: null | number;
  error: { key: null | SwapsError; description: null | string };
  topAggId: null | string;
  isInPolling: boolean;
  pollingCyclesLeft: number;
  approvalTransaction: TxParams | null;
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
};

/**
 * The action that fetches the state of the {@link SwapsController}.
 */
export type SwapsControllerGetStateAction = ControllerGetStateAction<
  typeof controllerName,
  SwapsControllerState
>;

/**
 * The event that {@link SwapsController} can emit.
 */
export type SwapsControllerStateChangeEvent = ControllerStateChangeEvent<
  typeof controllerName,
  SwapsControllerState
>;

/**
 * The external actions available to the {@link SwapsController}.
 * TODO: Add GasFeeControllerFetchGasFeeEstimates once GasFeeController exports this action type
 */
export type AllowedActions = NetworkControllerGetNetworkClientByIdAction;

/**
 * The internal actions available to the SwapsController.
 */
export type SwapsControllerActions =
  | SwapsControllerGetStateAction
  | SwapsControllerUpdateQuotesWithGasPrice
  | SwapsControllerUpdateSelectedQuoteWithGasLimit
  | SwapsControllerStartFetchAndSetQuotes
  | SwapsControllerFetchTokenWithCache
  | SwapsControllerFetchTopAssetsWithCache
  | SwapsControllerFetchAggregatorMetadataWithCache
  | SwapsControllerStopPollingAndResetState;

/**
 * The events that the SwapsController can emit.
 */
export type SwapsControllerEvents = SwapsControllerStateChangeEvent;

/**
 * The internal actions available to the SwapsController.
 */
export type AllowedEvents = NetworkControllerNetworkDidChangeEvent;

/**
 * The messenger for the SwapsController.
 */
export type SwapsControllerMessenger = RestrictedControllerMessenger<
  typeof controllerName,
  SwapsControllerActions | AllowedActions,
  SwapsControllerEvents | AllowedEvents,
  AllowedActions['type'],
  AllowedEvents['type']
>;

export type SwapsControllerOptions = {
  clientId?: string;
  pollCountLimit?: number;
  fetchAggregatorMetadataThreshold?: number;
  fetchTokensThreshold?: number;
  fetchTopAssetsThreshold?: number;
  supportedChainIds?: Hex[];
  // TODO: Remove once GasFeeController exports this action type
  fetchGasFeeEstimates?: GasFeeController['fetchGasFeeEstimates'];
  fetchEstimatedMultiLayerL1Fee?: (
    eth: EthQuery,
    options: {
      txParams: TxParams;
      networkClientId: NetworkClientId;
    },
  ) => Promise<string | undefined>;
  messenger: SwapsControllerMessenger;
};

/**
 * The action that updates quotes with gas price {@link SwapsController}.
 */
export type SwapsControllerUpdateQuotesWithGasPrice = {
  type: `SwapsController:updateQuotesWithGasPrice`;
  handler: SwapsController['updateQuotesWithGasPrice'];
};

/**
 * The action that updates the selected quote with gas limit {@link SwapsController}.
 */
export type SwapsControllerUpdateSelectedQuoteWithGasLimit = {
  type: `SwapsController:updateSelectedQuoteWithGasLimit`;
  handler: SwapsController['updateSelectedQuoteWithGasLimit'];
};

/**
 * The action that starts fetching and setting quotes {@link SwapsController}.
 */
export type SwapsControllerStartFetchAndSetQuotes = {
  type: `SwapsController:startFetchAndSetQuotes`;
  handler: SwapsController['startFetchAndSetQuotes'];
};

/**
 * The action that fetches a token with cache {@link SwapsController}.
 */
export type SwapsControllerFetchTokenWithCache = {
  type: `SwapsController:fetchTokenWithCache`;
  handler: SwapsController['fetchTokenWithCache'];
};

/**
 * The action that fetches top assets with cache {@link SwapsController}.
 */
export type SwapsControllerFetchTopAssetsWithCache = {
  type: `SwapsController:fetchTopAssetsWithCache`;
  handler: SwapsController['fetchTopAssetsWithCache'];
};

/**
 * The action that fetches aggregator metadata with cache {@link SwapsController}.
 */
export type SwapsControllerFetchAggregatorMetadataWithCache = {
  type: `SwapsController:fetchAggregatorMetadataWithCache`;
  handler: SwapsController['fetchAggregatorMetadataWithCache'];
};

/**
 * The action that stops polling and resets state {@link SwapsController}.
 */
export type SwapsControllerStopPollingAndResetState = {
  type: `SwapsController:stopPollingAndResetState`;
  handler: SwapsController['stopPollingAndResetState'];
};

/**
 * Standard data concerning a transaction to be processed by the blockchain.
 *
 * Note that this is copied from `@metamask/transaction-controller@37.3.0` in order to
 * avoid needing to satisfy peer dependencies on `@metamask/accounts-controller`
 * and `@metamask/snaps-controllers,` which brings potentially conflicting
 * versions of `@metamask/providers` and `@metamask/snaps-sdk` into the
 * dependency tree.
 */
export type TransactionParams = {
  /**
   * A list of addresses and storage keys that the transaction plans to access.
   */
  accessList?: AccessList;
  /**
   * Network ID as per EIP-155.
   */
  chainId?: Hex;
  /**
   * Data to pass with this transaction.
   */
  data?: string;
  /**
   * Error message for gas estimation failure.
   */
  estimateGasError?: string;
  /**
   * Estimated base fee for this transaction.
   */
  estimatedBaseFee?: string;
  /**
   * Which estimate level that the API suggested.
   */
  estimateSuggested?: string;
  /**
   * Which estimate level was used
   */
  estimateUsed?: string;
  /**
   * Address to send this transaction from.
   */
  from: string;
  /**
   * same as gasLimit?
   */
  gas?: string;
  /**
   * Maxmimum number of units of gas to use for this transaction.
   */
  gasLimit?: string;
  /**
   * Price per gas for legacy txs
   */
  gasPrice?: string;
  /**
   * Gas used in the transaction.
   */
  gasUsed?: string;
  /**
   * Maximum amount per gas to pay for the transaction, including the priority
   * fee.
   */
  maxFeePerGas?: string;
  /**
   * Maximum amount per gas to give to validator as incentive.
   */
  maxPriorityFeePerGas?: string;
  /**
   * Unique number to prevent replay attacks.
   */
  nonce?: string;
  /**
   * Address to send this transaction to.
   */
  to?: string;
  /**
   * Value associated with this transaction.
   */
  value?: string;
  /**
   * Type of transaction.
   * 0x0 indicates a legacy transaction.
   */
  type?: string;
};

/**
 * Information about a network as well as a way to access it.
 */
export type Network = {
  client: NetworkClient;
  clientId: NetworkClientId;
  chainId: Hex;
  ethersProvider: Web3Provider;
  ethQuery: EthQuery;
};
