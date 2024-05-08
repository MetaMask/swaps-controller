import { BigNumber } from 'bignumber.js';

import type { SwapsToken } from './swapsInterfaces';
import { APIType } from './swapsInterfaces';
import * as swapsUtil from './swapsUtil';

/**
 * Mocks the fetch function for testing purposes.
 * @param urlResponseMap - A map of base URL and corresponding response.
 * @returns An object with a method to clear the mock.
 */
function mockFetch(urlResponseMap: Record<string, any>) {
  jest.spyOn(global, 'fetch').mockImplementation(async (url, _) => {
    const matchingUrlKey = Object.keys(urlResponseMap).find((key) =>
      (url as string).startsWith(key),
    );
    if (!matchingUrlKey) {
      console.error(`No mock response for URL: ${url as string}`);
      return Promise.resolve({
        json: async () => Promise.resolve({}),
      }) as Promise<Response>;
    }

    const response = urlResponseMap[matchingUrlKey];

    if (response.throws) {
      return Promise.reject(new Error('Mock fetch error'));
    }

    return Promise.resolve({
      json: async () => Promise.resolve(response.body),
      ok: true,
      url: matchingUrlKey,
    }) as Promise<Response>;
  });

  return {
    clearMock: () => (global.fetch as jest.Mock).mockRestore(),
  };
}

const API_TRADES = [
  {
    trade: null,
    sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    sourceAmount: '1000000000000000000',
    destinationAmount: null,
    error: 'Error fetching totle trade: Gas estimation failed.',
    approvalNeeded: null,
    maxGas: 2270000,
    averageGas: 583863,
    estimatedRefund: 38540,
    fetchTime: 2088,
    aggregator: 'totle',
    aggType: 'AGG',
    fee: 0.875,
    gasMultiplier: 1.5,
    priceSlippage: {
      ratio: 1,
      calculationError: 'No trade data to calculate price slippage',
      bucket: 'low',
    },
  },
  {
    trade: {
      data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000a706172617377617056320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e2000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000006c00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e300000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e83000000000000000000000000080bf510fcbf18b91105470639e9561022937712000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000056178a0d5f301baf6cf3e1cd53d9863437345bf9000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e8300000000000000000000000055662e225a3376759c24331a9aed764f8f0c9fbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005fb4431d000000000000000000000000000000000000000000000000164869496ddc1ff1000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000024f47261b0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024f47261b00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000421be34ecc3318073957cdf0c6f275946e0f7a8d462180669f26378854305f17b3572b429c7494fa458169ce645a772201374b047146178b9868d7eae9ab1d400f7d0300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000086d6574616d61736b000000000000000000000000000000000000000000000000',
      from: '0xB0dA5965D43369968574D399dBe6374683773a65',
      value: '0',
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      gas: 2750000,
    },
    sourceAmount: '1000000000000000000',
    destinationAmount: '994675',
    error: null,
    sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    approvalNeeded: null,
    maxGas: 2750000,
    averageGas: 637198,
    estimatedRefund: 665220,
    fetchTime: 1049,
    aggregator: 'paraswap',
    aggType: 'AGG',
    fee: 0.875,
    gasMultiplier: 1.5,
    priceSlippage: {
      ratio: 1.0081693243499585,
      calculationError: '',
      bucket: 'low',
    },
  },
  {
    trade: {
      data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000007756e69737761700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000000000ed0c60000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000005fb44be60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f161421c8e00000000000000000000000000000000000000000000000000000000000000000040000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000009f8f72aa9304c8b593d555f12ef6589cc3a579a2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      from: '0xB0dA5965D43369968574D399dBe6374683773a65',
      value: '0',
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      gas: 770000,
    },
    sourceAmount: '1000000000000000000',
    destinationAmount: '1000079',
    error: null,
    sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    approvalNeeded: null,
    maxGas: 770000,
    averageGas: 210546,
    estimatedRefund: 80000,
    fetchTime: 669,
    aggregator: 'uniswap',
    aggType: 'DEX',
    fee: 0.875,
    gasMultiplier: 1.5,
    priceSlippage: {
      ratio: 1.0027216076907874,
      calculationError: '',
      bucket: 'low',
    },
  },
];

const API_TOKENS: SwapsToken[] = [
  {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    decimals: 18,
    occurrences: 30,
    iconUrl:
      'https://cloudflare-ipfs.com/ipfs/QmNYVMm3iC7HEoxfvxsZbRoapdjDHj9EREFac4BPeVphSJ',
  },
  {
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    decimals: 6,
    occurrences: 30,
    iconUrl:
      'https://cloudflare-ipfs.com/ipfs/QmR3TGmDDdmid99ExTHwPiKro4njZhSidbjcTbSrS5rHnq',
  },
  {
    address: '0x8e870d67f660d95d5be530380d0ec0bd388289e1',
    symbol: 'PAX',
    decimals: 18,
    occurrences: 30,
    iconUrl:
      'https://cloudflare-ipfs.com/ipfs/QmQTzo6Ecdn54x7NafwegjLetAnno1ATL9Y8M3PcVXGVhR',
  },
];

const FAKE_SWAPS_TOKEN = {
  address: '0x0000000000000000000000000000000000000000',
  symbol: 'fakeswap',
  decimals: 18,
  occurrences: 30,
  iconUrl:
    'https://cloudflare-ipfs.com/ipfs/QmQTzo6Ecdn54x7NafwegjLetAnno1ATL9Y8M3PcVXGVhR',
};

describe('SwapsUtil', () => {
  describe('getBaseApiURL', () => {
    it('should return expected values', () => {
      expect(swapsUtil.getBaseApiURL(APIType.TRADES, '0x1')).toBeDefined();
      expect(swapsUtil.getBaseApiURL(APIType.TOKENS, '0x1')).toBeDefined();
      expect(swapsUtil.getBaseApiURL(APIType.TOKEN, '0x1')).toBeDefined();
      expect(swapsUtil.getBaseApiURL(APIType.TOP_ASSETS, '0x1')).toBeDefined();
      expect(
        swapsUtil.getBaseApiURL(APIType.FEATURE_FLAG, '0x1'),
      ).toBeDefined();

      expect(
        swapsUtil.getBaseApiURL(APIType.AGGREGATOR_METADATA, '0x1'),
      ).toBeDefined();
      expect(swapsUtil.getBaseApiURL(APIType.GAS_PRICES, '0x1')).toBeDefined();
      expect(() =>
        swapsUtil.getBaseApiURL('error value' as APIType, '0x1'),
      ).toThrow();
    });
  });

  describe('isValidContractAddress', () => {
    it('should validate correctly', () => {
      expect(
        swapsUtil.isValidContractAddress(swapsUtil.ETH_CHAIN_ID, undefined),
      ).toBe(false);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.ETH_CHAIN_ID,
          swapsUtil.getSwapsContractAddress(swapsUtil.ETH_CHAIN_ID),
        ),
      ).toBe(true);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.ETH_CHAIN_ID,
          swapsUtil.ETH_SWAPS_CONTRACT_ADDRESS,
        ),
      ).toBe(true);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.SWAPS_TESTNET_CHAIN_ID,
          swapsUtil.ETH_SWAPS_CONTRACT_ADDRESS,
        ),
      ).toBe(true);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.ETH_CHAIN_ID,
          swapsUtil.WETH_CONTRACT_ADDRESS,
        ),
      ).toBe(true);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.BSC_CHAIN_ID,
          swapsUtil.BSC_SWAPS_CONTRACT_ADDRESS,
        ),
      ).toBe(true);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.ETH_CHAIN_ID,
          swapsUtil.BSC_SWAPS_CONTRACT_ADDRESS,
        ),
      ).toBe(false);

      expect(
        swapsUtil.isValidContractAddress(
          swapsUtil.BSC_CHAIN_ID,
          swapsUtil.ETH_SWAPS_CONTRACT_ADDRESS,
        ),
      ).toBe(false);
    });
  });

  describe('getTokenMetadataURL', () => {
    it('should work', () => {
      expect(swapsUtil.getTokenMetadataURL('0x1')).toBe(
        'https://swap.metaswap.codefi.network/networks/1/token',
      );

      expect(swapsUtil.getTokenMetadataURL(swapsUtil.ETH_CHAIN_ID)).toBe(
        'https://swap.metaswap.codefi.network/networks/1/token',
      );

      expect(
        swapsUtil.getTokenMetadataURL(swapsUtil.SWAPS_TESTNET_CHAIN_ID),
      ).toBe('https://swap.dev-api.cx.metamask.io/networks/1/token');

      expect(swapsUtil.getTokenMetadataURL(swapsUtil.BSC_CHAIN_ID)).toBe(
        'https://swap.metaswap.codefi.network/networks/56/token',
      );

      expect(swapsUtil.getTokenMetadataURL(swapsUtil.POLYGON_CHAIN_ID)).toBe(
        'https://swap.metaswap.codefi.network/networks/137/token',
      );
    });
  });

  describe('fetchTradesInfo', () => {
    it('should work', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/networks/1/trades?destinationToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sourceToken=0x6b175474e89094c44da98b954eedeac495271d0f&sourceAmount=1000000000000000000&slippage=3&timeout=10000&walletAddress=0xB0dA5965D43369968574D399dBe6374683773a65':
          { body: API_TRADES },
        'https://swap.metaswap.codefi.network/networks/1/trades?destinationToken=0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48&sourceToken=0x6b175474e89094c44da98b954eedeac495271d0f&sourceAmount=1000000000000000000&slippage=3&timeout=10000&walletAddress=0xB0dA5965D43369968574D399dBe6374683773a65&clientId=mobile':
          { body: API_TRADES },
      });

      const quotes = await swapsUtil.fetchTradesInfo(
        {
          slippage: 3,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          sourceAmount: 1000000000000000000,
          walletAddress: '0xB0dA5965D43369968574D399dBe6374683773a65',
        },
        null,
        '0x1',
      );

      const quotesWithClientId = await swapsUtil.fetchTradesInfo(
        {
          slippage: 3,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          sourceAmount: 1000000000000000000,
          walletAddress: '0xB0dA5965D43369968574D399dBe6374683773a65',
        },
        null,
        '0x1',
        'mobile',
      );

      const response = {
        paraswap: {
          trade: {
            from: '0xb0da5965d43369968574d399dbe6374683773a65',
            data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000a706172617377617056320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e2000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000006c00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e300000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e83000000000000000000000000080bf510fcbf18b91105470639e9561022937712000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000056178a0d5f301baf6cf3e1cd53d9863437345bf9000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e8300000000000000000000000055662e225a3376759c24331a9aed764f8f0c9fbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005fb4431d000000000000000000000000000000000000000000000000164869496ddc1ff1000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000024f47261b0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024f47261b00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000421be34ecc3318073957cdf0c6f275946e0f7a8d462180669f26378854305f17b3572b429c7494fa458169ce645a772201374b047146178b9868d7eae9ab1d400f7d0300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000086d6574616d61736b000000000000000000000000000000000000000000000000',
            gas: '0x29f630',
            to: '0x881d40237659c251811cec9c364ef91dc08d300c',
            value: '0x0',
          },
          sourceAmount: '1000000000000000000',
          destinationAmount: '994675',
          error: null,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          approvalNeeded: null,
          maxGas: 2750000,
          averageGas: 637198,
          estimatedRefund: 665220,
          fetchTime: 1049,
          aggregator: 'paraswap',
          aggType: 'AGG',
          fee: 0.875,
          gasMultiplier: 1.5,
          priceSlippage: {
            ratio: 1.0081693243499585,
            calculationError: '',
            bucket: 'low',
          },
          slippage: 3,
        },
        uniswap: {
          trade: {
            from: '0xb0da5965d43369968574d399dbe6374683773a65',
            data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000007756e69737761700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000000000ed0c60000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000005fb44be60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f161421c8e00000000000000000000000000000000000000000000000000000000000000000040000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000009f8f72aa9304c8b593d555f12ef6589cc3a579a2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            gas: '0xbbfd0',
            to: '0x881d40237659c251811cec9c364ef91dc08d300c',
            value: '0x0',
          },
          sourceAmount: '1000000000000000000',
          destinationAmount: '1000079',
          error: null,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          approvalNeeded: null,
          maxGas: 770000,
          averageGas: 210546,
          estimatedRefund: 80000,
          fetchTime: 669,
          aggregator: 'uniswap',
          aggType: 'DEX',
          fee: 0.875,
          gasMultiplier: 1.5,
          priceSlippage: {
            ratio: 1.0027216076907874,
            calculationError: '',
            bucket: 'low',
          },
          slippage: 3,
        },
      };

      expect(quotes).toStrictEqual(response);
      expect(quotesWithClientId).toStrictEqual(response);
    });

    it('should work for direct wrapping', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/networks/1/trades?destinationToken=0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2&sourceToken=0x0000000000000000000000000000000000000000&sourceAmount=1000000000000000000&slippage=3&timeout=10000&walletAddress=0xB0dA5965D43369968574D399dBe6374683773a65&enableDirectWrapping=true':
          { body: API_TRADES },
      });

      const quotes = await swapsUtil.fetchTradesInfo(
        {
          slippage: 3,
          sourceToken: '0x0000000000000000000000000000000000000000',
          destinationToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
          sourceAmount: 1000000000000000000,
          walletAddress: '0xB0dA5965D43369968574D399dBe6374683773a65',
        },
        null,
        '0x1',
      );

      const response = {
        paraswap: {
          trade: {
            from: '0xb0da5965d43369968574d399dbe6374683773a65',
            data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000a706172617377617056320000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000007800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e2000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000006c00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000eb8e300000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e83000000000000000000000000080bf510fcbf18b91105470639e9561022937712000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000056178a0d5f301baf6cf3e1cd53d9863437345bf9000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e8300000000000000000000000055662e225a3376759c24331a9aed764f8f0c9fbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000f4f8d0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005fb4431d000000000000000000000000000000000000000000000000164869496ddc1ff1000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000024f47261b0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024f47261b00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000421be34ecc3318073957cdf0c6f275946e0f7a8d462180669f26378854305f17b3572b429c7494fa458169ce645a772201374b047146178b9868d7eae9ab1d400f7d0300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000086d6574616d61736b000000000000000000000000000000000000000000000000',
            gas: '0x29f630',
            to: '0x881d40237659c251811cec9c364ef91dc08d300c',
            value: '0x0',
          },
          sourceAmount: '1000000000000000000',
          destinationAmount: '994675',
          error: null,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          approvalNeeded: null,
          maxGas: 2750000,
          averageGas: 637198,
          estimatedRefund: 665220,
          fetchTime: 1049,
          aggregator: 'paraswap',
          aggType: 'AGG',
          fee: 0.875,
          gasMultiplier: 1.5,
          priceSlippage: {
            ratio: 1.0081693243499585,
            calculationError: '',
            bucket: 'low',
          },
          slippage: 3,
        },
        uniswap: {
          trade: {
            from: '0xb0da5965d43369968574d399dbe6374683773a65',
            data: '0x5f57552900000000000000000000000000000000000000000000000000000000000000800000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000000000000000000000000000000de0b6b3a764000000000000000000000000000000000000000000000000000000000000000000c00000000000000000000000000000000000000000000000000000000000000007756e69737761700000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000006b175474e89094c44da98b954eedeac495271d0f000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000dc1a09f859b200000000000000000000000000000000000000000000000000000000000000ed0c60000000000000000000000000000000000000000000000000000000000000120000000000000000000000000000000000000000000000000000000005fb44be60000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001f161421c8e00000000000000000000000000000000000000000000000000000000000000000040000000000000000000000006b175474e89094c44da98b954eedeac495271d0f0000000000000000000000009f8f72aa9304c8b593d555f12ef6589cc3a579a2000000000000000000000000dac17f958d2ee523a2206206994597c13d831ec7000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            gas: '0xbbfd0',
            to: '0x881d40237659c251811cec9c364ef91dc08d300c',
            value: '0x0',
          },
          sourceAmount: '1000000000000000000',
          destinationAmount: '1000079',
          error: null,
          sourceToken: '0x6b175474e89094c44da98b954eedeac495271d0f',
          destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
          approvalNeeded: null,
          maxGas: 770000,
          averageGas: 210546,
          estimatedRefund: 80000,
          fetchTime: 669,
          aggregator: 'uniswap',
          aggType: 'DEX',
          fee: 0.875,
          gasMultiplier: 1.5,
          priceSlippage: {
            ratio: 1.0027216076907874,
            calculationError: '',
            bucket: 'low',
          },
          slippage: 3,
        },
      };

      expect(quotes).toStrictEqual(response);
    });
  });

  describe('fetchTokens', () => {
    it('should work', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/networks/1/tokens': {
          body: API_TOKENS.concat([FAKE_SWAPS_TOKEN]),
        },
      });
      const tokens = await swapsUtil.fetchTokens('0x1');
      expect(tokens).toStrictEqual(
        API_TOKENS.concat([swapsUtil.ETH_SWAPS_TOKEN_OBJECT]),
      );
    });
  });

  describe('fetchAggregatorMetadata', () => {
    it('should work', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/networks/1/aggregatorMetadata': {
          body: API_TRADES,
        },
      });
      const aggregatorsMetadata = await swapsUtil.fetchAggregatorMetadata(
        '0x1',
      );
      expect(aggregatorsMetadata).toBeInstanceOf(Object);
    });
  });

  describe('fetchTopAssets', () => {
    it('should work', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/networks/1/topAssets': {
          body: API_TRADES,
        },
      });
      const assets = await swapsUtil.fetchTopAssets('0x1');
      expect(assets).toBeDefined();
      expect(assets).toBeInstanceOf(Array);
    });
  });

  describe('fetchSwapsFeatureLiveness', () => {
    it('should work', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/featureFlags': {
          body: {
            bsc: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: true,
            },
            ethereum: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: true,
            },
            polygon: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: false,
            },
          },
        },
      });
      const featureLiveness = await swapsUtil.fetchSwapsFeatureLiveness('0x1');
      expect(featureLiveness).toBeInstanceOf(Object);
    });

    it('should return undefined on unsupported networks', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/featureFlags': {
          body: {
            bsc: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: true,
            },
            ethereum: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: true,
            },
            polygon: {
              mobile_active: false,
              extension_active: true,
              fallback_to_v1: false,
            },
          },
        },
      });
      const featureLiveness = await swapsUtil.fetchSwapsFeatureLiveness(
        '0x321',
      );
      expect(featureLiveness).toBeUndefined();
    });

    it('should throw on exception', async () => {
      mockFetch({
        'https://swap.metaswap.codefi.network/featureFlags': {
          throws: true,
        },
      });

      await expect(async () =>
        swapsUtil.fetchSwapsFeatureLiveness('0x1'),
      ).rejects.toThrow();
    });
  });

  describe('fetchGasPrices', () => {
    it('should work', async () => {
      mockFetch({
        'https://gas.api.cx.metamask.io/networks/1/gasPrices': {
          body: {
            SafeGasPrice: '1',
            ProposeGasPrice: '2',
            FastGasPrice: '3',
          },
        },
        'https://gas.api.cx.metamask.io/networks/56/gasPrices': {
          body: {
            SafeGasPrice: '4',
            ProposeGasPrice: '5',
            FastGasPrice: '6',
          },
        },
      });
      const gasPrices = await swapsUtil.fetchGasPrices('0x1');
      const gasPricesBSC = await swapsUtil.fetchGasPrices('0x38');
      expect(gasPrices).toStrictEqual({
        safeGasPrice: '1',
        proposedGasPrice: '2',
        fastGasPrice: '3',
      });

      expect(gasPricesBSC).toStrictEqual({
        safeGasPrice: '4',
        proposedGasPrice: '5',
        fastGasPrice: '6',
      });
    });
  });

  describe('getMedianEthValueQuote', () => {
    it('should throw when argument is not array or empty', () => {
      expect(() => {
        return swapsUtil.getMedianEthValueQuote([]);
      }).toThrow();

      expect(() => {
        // @ts-expect-error: Argument string is not array
        return swapsUtil.getMedianEthValueQuote('not an array');
      }).toThrow();
    });

    it.todo('should work');
  });

  describe('calculateGasEstimateWithRefund', () => {
    it('estimated with refund is more than estimated gas, return estimatedGas', () => {
      const maxGas = 500;
      const estimatedRefund = 10;
      const estimatedGas = 'c8'; // 200
      const expected = '200';
      const estimatedWithRefund = swapsUtil.calculateGasEstimateWithRefund(
        maxGas,
        estimatedRefund,
        estimatedGas,
      );
      expect(estimatedWithRefund.toString(10)).toStrictEqual(expected);
    });

    it('estimated with refund is more than estimated gas, return estimated with refund', () => {
      const maxGas = 500;
      const estimatedRefund = 10;
      const estimatedGas = '1f4'; // 500
      const expected = '490';
      const estimatedWithRefund = swapsUtil.calculateGasEstimateWithRefund(
        maxGas,
        estimatedRefund,
        estimatedGas,
      );
      expect(estimatedWithRefund.toString(10)).toStrictEqual(expected);
    });
  });

  describe('getMedian', () => {
    const numbers = [...Array(9).keys()].map((i) => new BigNumber(i + 1));
    const largeNumbers = numbers.map((i) => i.multipliedBy(100));

    it.each([
      [numbers, '5'],
      [largeNumbers, '500'],
    ])('returns the middle value', (values, result) => {
      const middleValue = swapsUtil.getMedian(values);
      expect(middleValue).toBeInstanceOf(BigNumber);
      expect(middleValue.toString(10)).toBe(result);
    });

    it.each([
      [[...numbers, new BigNumber(10)], '5.5'],
      [[...largeNumbers, new BigNumber(1000)], '550'],
    ])('returns the median value', (values, result) => {
      const medianValue = swapsUtil.getMedian(values);
      expect(medianValue).toBeInstanceOf(BigNumber);
      expect(medianValue.toString(10)).toBe(result);
    });

    it('should throw when argument is not array or empty', () => {
      expect(() => {
        return swapsUtil.getMedian([]);
      }).toThrow();

      expect(() => {
        // @ts-expect-error: Argument string is not array
        return swapsUtil.getMedian('not an array');
      }).toThrow();
    });
  });

  describe('calcTokenAmount', () => {
    it('should calculate amount', () => {
      expect(swapsUtil.calcTokenAmount(123456789, 8).toString(10)).toBe(
        '1.23456789',
      );

      expect(swapsUtil.calcTokenAmount(123456789, 0).toString(10)).toBe(
        '123456789',
      );
    });
  });

  describe('calculateGasLimits', () => {
    const gasEstimateWithRefund = '0x3c';
    const gasEstimate = '0x46';
    const averageGas = 20;
    const maxGas = 40;
    const customGasLimit = '0x17';
    const gasMultiplier = 1.2;
    it('if approval is needed, maxGas is the limit and averageGas is the estimated fee', () => {
      const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil.calculateGasLimits(
        true,
        gasEstimateWithRefund,
        gasEstimate,
        averageGas,
        maxGas,
        gasMultiplier,
        null,
      );
      expect(tradeGasLimit.toString()).toStrictEqual(averageGas.toString());
      expect(tradeMaxGasLimit.toString()).toStrictEqual(maxGas.toString());
    });

    it('if no approval is needed, gas limit is gas limit minus refund and max gas is the gas estimated by multiplier', () => {
      const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil.calculateGasLimits(
        false,
        gasEstimateWithRefund,
        gasEstimate,
        averageGas,
        maxGas,
        gasMultiplier,
        null,
      );
      const limit: BigNumber = new BigNumber(gasEstimateWithRefund);
      expect(tradeGasLimit.toString(16)).toStrictEqual(limit.toString(16));
      expect(tradeMaxGasLimit.toString(16)).toStrictEqual(
        new BigNumber(gasEstimate).times(gasMultiplier).toString(16),
      );
    });

    it('if approval is needed and custom gas limit, max gas is custom gas limit and averageGas is the estimated fee', () => {
      const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil.calculateGasLimits(
        true,
        gasEstimateWithRefund,
        gasEstimate,
        averageGas,
        maxGas,
        gasMultiplier,
        customGasLimit,
      );
      expect(tradeGasLimit.toString()).toStrictEqual(averageGas.toString());
      expect(tradeMaxGasLimit.toString(16)).toStrictEqual(
        new BigNumber(customGasLimit).toString(16),
      );
    });

    it('if no approval is needed and custom gas limit, gas limit is gas limit minus refund and max gas is the custom gas limit', () => {
      const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil.calculateGasLimits(
        false,
        gasEstimateWithRefund,
        gasEstimate,
        averageGas,
        maxGas,
        gasMultiplier,
        customGasLimit,
      );
      const limit: BigNumber = new BigNumber(gasEstimateWithRefund);
      expect(tradeGasLimit.toString(16)).toStrictEqual(limit.toString(16));
      expect(tradeMaxGasLimit.toString(16)).toStrictEqual(
        new BigNumber(customGasLimit).toString(16),
      );
    });
  });

  describe('shouldEnableDirectWrapping', () => {
    const randomTokenAddress = '0x881d40237659c251811cec9c364ef91234567890';
    const ETH = swapsUtil.SWAPS_NATIVE_TOKEN_OBJECTS[swapsUtil.ETH_CHAIN_ID];
    const BNB = swapsUtil.SWAPS_NATIVE_TOKEN_OBJECTS[swapsUtil.BSC_CHAIN_ID];
    const MATIC =
      swapsUtil.SWAPS_NATIVE_TOKEN_OBJECTS[swapsUtil.POLYGON_CHAIN_ID];

    if (!ETH || !BNB || !MATIC) {
      throw new Error('Test setup error: Token objects are not defined');
    }

    it('returns true if swapping from ETH to WETH', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.ETH_CHAIN_ID,
          ETH.address,
          swapsUtil.WETH_CONTRACT_ADDRESS,
        ),
      ).toBe(true);
    });

    it('returns true if swapping from WETH to ETH', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.ETH_CHAIN_ID,
          swapsUtil.WETH_CONTRACT_ADDRESS,
          ETH.address,
        ),
      ).toBe(true);
    });

    it('returns true if swapping from ETH to WETH with uppercase contract address', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.ETH_CHAIN_ID,
          ETH.address,
          '0xc02AAA39b223fe8d0a0e5c4f27ead9083c756CC2',
        ),
      ).toBe(true);
    });

    it('returns false if swapping from ETH to a non-WETH token', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.ETH_CHAIN_ID,
          ETH.address,
          randomTokenAddress,
        ),
      ).toBe(false);
    });

    it('returns true if swapping from BNB to WBNB', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.BSC_CHAIN_ID,
          BNB.address,
          swapsUtil.WBNB_CONTRACT_ADDRESS,
        ),
      ).toBe(true);
    });

    it('returns true if swapping from WBNB to BNB', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.BSC_CHAIN_ID,
          swapsUtil.WBNB_CONTRACT_ADDRESS,
          BNB.address,
        ),
      ).toBe(true);
    });

    it('returns false if swapping from BNB to a non-WBNB token', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.BSC_CHAIN_ID,
          BNB.address,
          randomTokenAddress,
        ),
      ).toBe(false);
    });

    it('returns true if swapping from MATIC to WMATIC', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.POLYGON_CHAIN_ID,
          MATIC.address,
          swapsUtil.WMATIC_CONTRACT_ADDRESS,
        ),
      ).toBe(true);
    });

    it('returns true if swapping from WMATIC to MATIC', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.POLYGON_CHAIN_ID,
          swapsUtil.WMATIC_CONTRACT_ADDRESS,
          MATIC.address,
        ),
      ).toBe(true);
    });

    it('returns false if swapping from MATIC to a non-WMATIC token', () => {
      expect(
        swapsUtil.shouldEnableDirectWrapping(
          swapsUtil.POLYGON_CHAIN_ID,
          MATIC.address,
          randomTokenAddress,
        ),
      ).toBe(false);
    });
  });
});
