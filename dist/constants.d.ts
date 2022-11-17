import { SwapsToken } from './swapsInterfaces';
export declare const ETH_CHAIN_ID = "1";
export declare const BSC_CHAIN_ID = "56";
export declare const POLYGON_CHAIN_ID = "137";
export declare const AVALANCHE_CHAIN_ID = "43114";
export declare const ARBITRUM_CHAIN_ID = "42161";
export declare const OPTIMISM_CHAIN_ID = "10";
export declare const SWAPS_TESTNET_CHAIN_ID = "1337";
export declare const CHAIN_ID_TO_NAME_MAP: {
    [key: string]: string;
};
export declare const API_BASE_URL = "https://swap.metaswap.codefi.network";
export declare const DEV_BASE_URL = "https://swap.metaswap-dev.codefi.network";
export declare const GAS_API_BASE_URL = "https://gas.metaswap.codefi.network";
export declare const ETH_SWAPS_CONTRACT_ADDRESS = "0x881d40237659c251811cec9c364ef91dc08d300c";
export declare const BSC_SWAPS_CONTRACT_ADDRESS = "0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31";
export declare const POLYGON_SWAPS_CONTRACT_ADDRESS = "0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31";
export declare const AVALANCHE_SWAPS_CONTRACT_ADDRESS = "0x1a1ec25dc08e98e5e93f1104b5e5cdd298707d31";
export declare const ARBITRUM_SWAPS_CONTRACT_ADDRESS = "0x9dDA6Ef3D919c9bC8885D5560999A3640431e8e6";
export declare const OPTIMISM_SWAPS_CONTRACT_ADDRESS = "0x9dDA6Ef3D919c9bC8885D5560999A3640431e8e6";
export declare const WETH_CONTRACT_ADDRESS = "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2";
export declare const WBNB_CONTRACT_ADDRESS = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
export declare const WMATIC_CONTRACT_ADDRESS = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
export declare const WAVAX_CONTRACT_ADDRESS = "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7";
export declare const WETH_ARBITRUM_CONTRACT_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export declare const WETH_OPTIMISM_CONTRACT_ADDRESS = "0x4200000000000000000000000000000000000006";
export declare const SWAPS_WRAPPED_TOKENS_ADDRESSES: {
    [key: string]: string;
};
export declare const SWAPS_CONTRACT_ADDRESSES: {
    [key: string]: string;
};
export declare const ALLOWED_CONTRACT_ADDRESSES: {
    [key: string]: string[];
};
export declare const NATIVE_SWAPS_TOKEN_ADDRESS = "0x0000000000000000000000000000000000000000";
export declare const ETH_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const BSC_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const POLYGON_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const AVALANCHE_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const ARBITRUM_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const OPTIMISM_SWAPS_TOKEN_OBJECT: SwapsToken;
export declare const SWAPS_NATIVE_TOKEN_OBJECTS: {
    [key: string]: SwapsToken;
};
export declare const TOKEN_TRANSFER_LOG_TOPIC_HASH = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
export declare const DEFAULT_ERC20_APPROVE_GAS = "0x1d4c0";
export declare const MAX_GAS_LIMIT = 2500000;
