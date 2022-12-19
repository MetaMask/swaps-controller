import { Transaction } from '@metamask/controllers';
import { BigNumber } from 'bignumber.js';
export declare enum APIType {
    TRADES = "TRADES",
    TOKENS = "TOKENS",
    TOP_ASSETS = "TOP_ASSETS",
    FEATURE_FLAG = "FEATURE_FLAG",
    AGGREGATOR_METADATA = "AGGREGATOR_METADATA",
    TOKEN = "TOKEN",
    GAS_PRICES = "GAS_PRICES"
}
export interface SwapsAsset {
    address: string;
    symbol: string;
    name?: string;
}
export interface SwapsToken extends SwapsAsset {
    decimals: number;
    occurrences?: number;
    iconUrl?: string;
}
export interface NetworkFeatureFlags {
    mobile_active: boolean;
    extension_active: boolean;
    fallback_to_v1?: boolean;
}
export interface NetworksFeatureStatus {
    [network: string]: NetworkFeatureFlags;
}
/**
 * Metadata needed to fetch quotes
 *
 * @interface APIFetchQuotesMetadata
 *
 * @property sourceTokenInfo - Source token information
 * @property destinationTokenInfo - Destination token information
 *
 */
export interface APIFetchQuotesMetadata {
    sourceTokenInfo: SwapsToken;
    destinationTokenInfo: SwapsToken;
}
/**
 * Parameters needed to fetch quotes
 *
 * @interface APIFetchQuotesParams
 *
 * @property slippage - Slippage
 * @property sourceToken - Source token address
 * @property sourceAmount - Source token amount
 * @property destinationToken - Destination token address
 * @property walletAddress - Address to do the swap from
 * @property exchangeList
 * @property metaData - Metadata needed to fetch quotes
 *
 */
export interface APIFetchQuotesParams {
    slippage: number;
    sourceToken: string;
    sourceAmount: number;
    destinationToken: string;
    walletAddress: string;
    timeout?: number;
    clientId?: string;
    enableDirectWrapping?: boolean;
}
/**
 * Aggregator metadata coming from API
 *
 * @interface APIAggregatorMetadata
 *
 */
export interface APIAggregatorMetadata {
    color: string;
    title: string;
    icon: string;
    iconPng: string;
}
interface QuoteTransaction extends Transaction {
    value: string;
}
/**
 * Savings of a quote
 *
 * @interface QuoteSavings
 */
export interface QuoteSavings {
    total: BigNumber;
    performance: BigNumber;
    fee: BigNumber;
    medianMetaMaskFee: BigNumber;
}
/**
 * Trade data structure coming from API, together with savings and gas estimations.
 *
 * @interface Quote
 *
 * @property trade - The ethereum transaction data for the swap
 * @property approvalNeeded - Ethereum transaction to complete a ERC20 approval, if needed
 * @property sourceAmount - Amount in minimal unit to send
 * @property destinationAmount - Amount in minimal unit to receive
 * @property error - Trade error, if any
 * @property sourceToken - Source token address
 * @property destinationToken - Destination token address
 * @property maxGas - Maximum gas to use
 * @property averageGas - Average gas to use
 * @property estimatedRefund - Destination token address
 * @property fetchTime - Fetch time
 * @property fee - MetaMask fee
 * @property quoteRefreshSeconds - Refresh quotes time
 * @property gasMultiplier
 * @property aggregator - Aggregator id
 * @property aggType - Aggregator type
 * @property priceSlippage - Price slippage information object
 * @property savings - Estimation of savings
 * @property gasEstimate - Estimation of gas
 * @property gasEstimateWithRefund - Estimation of gas with refund
 */
export interface Quote {
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
}
/**
 * Fees and values information for an aggregator
 *
 * @interface QuoteValues
 *
 * @property aggregator - Aggregator id
 * @property ethFee - Fee in ETH
 * @property maxEthFee - Maximum fee in ETH
 * @property ethValueOfTokens - Total value of tokens in ETH
 * @property overallValueOfQuote
 * @property metaMaskFeeInEth - MetaMask fee in ETH
 */
export interface QuoteValues {
    aggregator: string;
    tradeGasLimit: string;
    tradeMaxGasLimit: string;
    ethFee: string;
    maxEthFee: string;
    ethValueOfTokens: string;
    overallValueOfQuote: string;
    metaMaskFeeInEth: string;
}
/**
 * Metadata needed to fetch quotes
 *
 * @interface TransactionReceipt
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
    logs: {
        data: string;
        topics: string[];
        address: string;
    }[];
    status: string;
}
export interface ChainData {
    aggregatorMetadata: null | {
        [key: string]: APIAggregatorMetadata;
    };
    tokens: null | SwapsToken[];
    topAssets: null | SwapsAsset[];
    aggregatorMetadataLastFetched: number;
    tokensLastFetched: number;
    topAssetsLastFetched: number;
}
export interface ChainCache {
    [key: string]: ChainData;
}
export {};
