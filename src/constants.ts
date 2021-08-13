import { SwapsToken } from './swapsInterfaces';

//* Chain IDs and names

export const ETH_CHAIN_ID = '1';
export const BSC_CHAIN_ID = '56';
export const POLYGON_CHAIN_ID = '137';
export const SWAPS_TESTNET_CHAIN_ID = '1337';

export const CHAIN_ID_TO_NAME_MAP: { [key: string]: string } = {
  [ETH_CHAIN_ID]: 'ethereum',
  [BSC_CHAIN_ID]: 'bsc',
  [POLYGON_CHAIN_ID]: 'polygon',
  [SWAPS_TESTNET_CHAIN_ID]: 'ethereum',
};

//* APIs base urls

export const API_BASE_URL = 'https://api2.metaswap.codefi.network';
export const DEV_BASE_URL = 'https://api2.metaswap-dev.codefi.network';
export const GAS_API_BASE_URL = 'https://gas-api.metaswap.codefi.network';

//* Contract addresses

export const ETH_SWAPS_CONTRACT_ADDRESS =
  '0x881d40237659c251811cec9c364ef91dc08d300c';
export const BSC_SWAPS_CONTRACT_ADDRESS =
  '0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31';
export const POLYGON_SWAPS_CONTRACT_ADDRESS =
  '0x1a1ec25DC08e98e5E93F1104B5e5cdD298707d31';

export const WETH_CONTRACT_ADDRESS =
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';
export const WBNB_CONTRACT_ADDRESS =
  '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
export const WMATIC_CONTRACT_ADDRESS =
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270';

export const SWAPS_CONTRACT_ADDRESSES: { [key: string]: string } = {
  [ETH_CHAIN_ID]: ETH_SWAPS_CONTRACT_ADDRESS,
  [SWAPS_TESTNET_CHAIN_ID]: ETH_SWAPS_CONTRACT_ADDRESS,
  [BSC_CHAIN_ID]: BSC_SWAPS_CONTRACT_ADDRESS,
  [POLYGON_CHAIN_ID]: POLYGON_SWAPS_CONTRACT_ADDRESS,
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
  [BSC_CHAIN_ID]: [
    SWAPS_CONTRACT_ADDRESSES[BSC_CHAIN_ID],
    WBNB_CONTRACT_ADDRESS,
  ],
  [POLYGON_CHAIN_ID]: [
    SWAPS_CONTRACT_ADDRESSES[POLYGON_CHAIN_ID],
    WMATIC_CONTRACT_ADDRESS,
  ],
};

//* Tokens

export const NATIVE_SWAPS_TOKEN_ADDRESS =
  '0x0000000000000000000000000000000000000000';

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

export const POLYGON_SWAPS_TOKEN_OBJECT: SwapsToken = {
  symbol: 'MATIC',
  name: 'Matic',
  address: NATIVE_SWAPS_TOKEN_ADDRESS,
  decimals: 18,
};

export const SWAPS_NATIVE_TOKEN_OBJECTS: { [key: string]: SwapsToken } = {
  [ETH_CHAIN_ID]: ETH_SWAPS_TOKEN_OBJECT,
  [SWAPS_TESTNET_CHAIN_ID]: ETH_SWAPS_TOKEN_OBJECT,
  [BSC_CHAIN_ID]: BSC_SWAPS_TOKEN_OBJECT,
  [POLYGON_CHAIN_ID]: POLYGON_SWAPS_TOKEN_OBJECT,
};

//* Other

export const TOKEN_TRANSFER_LOG_TOPIC_HASH =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export const DEFAULT_ERC20_APPROVE_GAS = '0x1d4c0';

// The MAX_GAS_LIMIT is a number that is higher than the maximum gas costs we have observed on any aggregator
export const MAX_GAS_LIMIT = 2500000;
