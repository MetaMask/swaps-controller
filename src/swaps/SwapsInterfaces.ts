import BigNumber from 'bignumber.js';
import { Transaction } from '../transaction/TransactionController';

export enum APIType {
  TRADES = 'TRADES',
  TOKENS = 'TOKENS',
  TOP_ASSETS = 'TOP_ASSETS',
  FEATURE_FLAG = 'FEATURE_FLAG',
  AGGREGATOR_METADATA = 'AGGREGATOR_METADATA',
  GAS_PRICES = 'GAS_PRICES',
}

export interface SwapsAsset {
  address: string;
  symbol: string;
  name?: string;
}

export interface SwapsToken extends SwapsAsset {
  decimals: number;
  occurances?: number;
  iconUrl?: string;
}

/**
 * Metadata needed to fetch quotes
 *
 * @interface APIFetchQuotesMetadata
 *
 * @property sourceTokenInfo - Source token information
 * @property destinationTokenInfo - Destination token information
 * @property accountBalance Current - ETH account balance
 * @property destinationTokenConversionRate - Current conversion rate to ETH of destination token
 *
 */
export interface APIFetchQuotesMetadata {
  sourceTokenInfo: SwapsToken;
  destinationTokenInfo: SwapsToken;
  accountBalance: string;
  destinationTokenConversionRate?: string;
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
 * @property balanceError
 * @property metaData - Metadata needed to fetch quotes
 *
 */
export interface APIFetchQuotesParams {
  slippage: number;
  sourceToken: string;
  sourceAmount: number;
  destinationToken: string;
  walletAddress: string;
  exchangeList?: string[];
  balanceError?: boolean;
  timeout?: number;
  clientId?: string;
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
  ethFee: string;
  maxEthFee: string;
  ethValueOfTokens: string;
  overallValueOfQuote: string;
  metaMaskFeeInEth: string;
}
