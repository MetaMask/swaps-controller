import { ComposableController } from '@metamask/composable-controller';

import SwapsController, { INITIAL_CHAIN_DATA } from './SwapsController';
import * as swapsUtil from './swapsUtil';
import { Quote } from './swapsInterfaces';
import BigNumber from 'bignumber.js';

const POLL_COUNT_LIMIT = 3;

const API_TRADES: {
  [key: string]: Quote;
} = {
  paraswap: {
    trade: {
      data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c0000000000000000000000000000000000000000000000000000000000000000a70617261737761705632000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000780000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000005908bf000000000000000000000000000000000000000000000000000000000000012000000000000000000000000000000000000000000000000000000000000006c0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000005908c000000000000000000000000000000000000000000000000000000000005c97e80000000000000000000000000000000000000000000000000000000000000140000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000068000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb480000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000020000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e83000000000000000000000000080bf510fcbf18b91105470639e9561022937712000000000000000000000000000000000000000000000000000000000000271000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003a00000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000002c00000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000056178a0d5f301baf6cf3e1cd53d9863437345bf9000000000000000000000000c9eeed34a6e0edb7f32cffd1d12e625564db9e8300000000000000000000000055662e225a3376759c24331a9aed764f8f0c9fbb000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005c97e8000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005fbc4b5f000000000000000000000000000000000000000000000000164a480bf71de3ba000000000000000000000000000000000000000000000000000000000000018000000000000000000000000000000000000000000000000000000000000001e00000000000000000000000000000000000000000000000000000000000000024f47261b0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000024f47261b0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000421cbe650637ba43625e3c4b021bba38856e0c948a1b7e69cb81923d421b6c6a0e317574e8ca0898f24cc10b4ac769c5a9e67ed422e79882105d369da8cf35af29b00300000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000086d6574616d61736b000000000000000000000000000000000000000000000000',
      from: '0xb0da5965d43369968574d399dbe6374683773a65',
      value: '0',
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      gas: '2750000',
    },
    sourceAmount: '10000000000000000',
    destinationAmount: 6015406,
    error: null,
    sourceToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    approvalNeeded: {
      data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c0000000000000000000000000000000000000000004a817c7ffffffdabf41c00',
      to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      from: '0xb0da5965d43369968574d399dbe6374683773a65',
      gas: '2750000',
    },
    maxGas: 2750000,
    averageGas: 637198,
    estimatedRefund: 665220,
    fetchTime: 6239,
    aggregator: 'paraswap',
    aggType: 'AGG',
    fee: 0.875,
    gasMultiplier: 1.5,
    quoteRefreshSeconds: 60,
    savings: {
      total: new BigNumber(0),
      performance: new BigNumber(0),
      fee: new BigNumber(0),
      medianMetaMaskFee: new BigNumber(0),
    },
    gasEstimate: '100000',
    gasEstimateWithRefund: '90000',
    destinationTokenRate: 0.9999999999999999,
    sourceTokenRate: 1.0000000000000002,
    multiLayerL1TradeFeeTotal: '0',
  },
  oneInch: {
    trade: {
      data: '0x5f5755290000000000000000000000000000000000000000000000000000000000000080000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000002386f26fc1000000000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000076f6e65496e63680000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000010c0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000000595c0000000000000000000000000000000000000000000000000000000000000001200000000000000000000000000000000000000000000000000000000000001000000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000002386f26fc100000000000000000000000000000000000000000000000000000000000000595c0000000000000000000000000000000000000000000000000000000000005c1f8200000000000000000000000011ededebf63bef0ea2d2d071bdf88f71543ec6fb000000000000000000000000000000000000000000000000000000000000014000000000000000000000000000000000000000000000000000000000000001a00000000000000000000000000000000000000000000000000000000000000f200000000000000000000000000000000000000000000000000000000000000fa00000000000000000000000000000000000000000000000000000000000000002000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000728bbe9bbee3af78ad611315076621865950b3440000000000000000000000000000000000000000000000000000000000000d48a9059cbb000000000000000000000000728bbe9bbee3af78ad611315076621865950b344000000000000000000000000000000000000000000000000002386f26fc10000e6adce0b0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000c04c2239eb0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000400000000000000000000000000000000000000000000000000000000000000b84f4e3b2ed00000000000000000000000000000000000000000000000000000000000000e0000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb48000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000005c1f8200000000000000000000000011ededebf63bef0ea2d2d071bdf88f71543ec6fb000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000001a0000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc2000000000000000000000000000000000000000000000000002386f26fc10000000000000000000000000000728bbe9bbee3af78ad611315076621865950b344000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000000000000000000000000000000000000000042000000000000000000000000000000000000000000000000000000000000006a0000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000011ededebf63bef0ea2d2d071bdf88f71543ec6fb00000000000000000000000000000000000000000000000000004f94ae6af80000000000000000000000000000000000000000000000000000000000000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000018455b181bb00000000000000000000000000000000000000000000000000000000000000808000000000000000000000000000000000000000000000000000000000000004000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000032000000000000000000000000000000320000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000000242e1a7d4d00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000000000000000000000000000000000000000001a455b181bb00000000000000000000000000000000000000000000000000000000000000804000000000000000000000000000000000000000000000000000000000000000000000000000000000000000eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee000000000000000000000000000000280000000000000000000000000000002800000000000000000000000097dec872013f6b5fb443861090ad93154287812600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000044f39b5b9b0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000005fbd9c450000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000a0000000000000000000000000000000000000000000000000000000000000024476a612750000000000000000000000000000000000000000000000000000000000000080800000000000000000000000000000000000000000000000000000000000004400000000000000000000000011cbb51eb0af993e70394272c177ae657820a65000000000000000000000000000000000000000000000000000000000000001c0000000000000000000000000728bbe9bbee3af78ad611315076621865950b34400000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000a00000000000000000000000000000000000000000000000000000000000000064d1660f99000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000068a17b587caf4f9329f0e372e3a78d23a46de6b5000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000004470bdb947000000000000000000000000a0b86991c6218b36c1d19d4a2e9eb0ce3606eb4800000000000000000000000000000000000000000000000000000000005c1f82000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000003000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000440000000000000000000000000000000000000000000000000000000000000d48000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000',
      from: '0xb0da5965d43369968574d399dbe6374683773a65',
      value: '0',
      to: '0x881D40237659C251811CEC9c364ef91dC08D300C',
      gas: '2530000',
    },
    sourceAmount: '10000000000000000',
    destinationAmount: 6037378,
    error: null,
    sourceToken: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    approvalNeeded: {
      data: '0x095ea7b3000000000000000000000000881d40237659c251811cec9c364ef91dc08d300c0000000000000000000000000000000000000000004a817c7ffffffdabf41c00',
      to: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      from: '0xb0da5965d43369968574d399dbe6374683773a65',
      gas: '2530000',
    },
    maxGas: 2530000,
    averageGas: 929497,
    estimatedRefund: 800430,
    fetchTime: 2656,
    aggregator: 'oneInch',
    aggType: 'AGG',
    fee: 0.875,
    gasMultiplier: 1.5,
    quoteRefreshSeconds: 60,
    savings: {
      total: new BigNumber(0),
      performance: new BigNumber(0),
      fee: new BigNumber(0),
      medianMetaMaskFee: new BigNumber(0),
    },
    gasEstimate: '100000',
    gasEstimateWithRefund: '90000',
    destinationTokenRate: 0.9999999999999999,
    sourceTokenRate: 1.0000000000000002,
    multiLayerL1TradeFeeTotal: '0',
  },
};

const mockFlags: { [key: string]: any } = {
  estimateGas: null,
};

jest.mock('@metamask/eth-query', () =>
  jest.fn().mockImplementation(() => {
    return {
      estimateGas: (_transaction: any, callback: any) => {
        if (mockFlags.estimateGas) {
          callback(new Error(mockFlags.estimateGas));
          return;
        }
        callback(undefined, '0x0');
      },
      gasPrice: (callback: any) => {
        callback(undefined, '0x0');
      },
      getBlockByNumber: (
        _blocknumber: any,
        _fetchTxs: boolean,
        callback: any,
      ) => {
        callback(undefined, { gasLimit: '0x0' });
      },
      getCode: (_to: any, callback: any) => {
        callback(undefined, '0x0');
      },
      getTransactionByHash: (_hash: any, callback: any) => {
        callback(undefined, { blockNumber: '0x1' });
      },
      getTransactionCount: (_from: any, _to: any, callback: any) => {
        callback(undefined, '0x0');
      },
      sendRawTransaction: (_transaction: any, callback: any) => {
        callback(undefined, '1337');
      },
    };
  }),
);

// Mock implementation of web3
jest.mock('web3', () => {
  return {
    Web3: jest.fn(() => ({
      eth: {
        Contract: jest.fn(() => ({
          methods: {
            allowance: jest.fn(() => ({
              call: jest.fn().mockResolvedValue('1000000000000000000'), // Mocked allowance value
            })),
          },
        })),
      },
    })),
  };
});

describe('SwapsController', () => {
  /* Setup */
  let fetchGasFeeEstimates: jest.Mock;
  let fetchEstimatedMultiLayerL1Fee: jest.Mock;
  let swapsController: SwapsController;
  let swapsUtilFetchTokens: jest.SpyInstance;
  let swapsUtilFetchTopAssets: jest.SpyInstance;
  let swapsUtilFetchAggregatorMetadata: jest.SpyInstance;
  let swapsUtilFetchTradesInfo: jest.SpyInstance;
  let swapsUtilEstimateGas: jest.SpyInstance;

  beforeEach(() => {
    fetchGasFeeEstimates = jest.fn().mockImplementation(() => ({
      gasFeeEstimates: {},
      estimatedGasFeeTimeBounds: {},
      gasEstimateType: 'none',
    }));

    fetchGasFeeEstimates = jest.fn();

    swapsController = new SwapsController(
      {
        fetchGasFeeEstimates,
        fetchEstimatedMultiLayerL1Fee,
      },
      {
        pollCountLimit: POLL_COUNT_LIMIT,
      },
    );
    new ComposableController([swapsController]);

    swapsUtilFetchTokens = jest
      .spyOn(swapsUtil, 'fetchTokens')
      .mockImplementation(() => [] as any);

    swapsUtilFetchTopAssets = jest
      .spyOn(swapsUtil, 'fetchTopAssets')
      .mockImplementation(() => [] as any);

    swapsUtilFetchAggregatorMetadata = jest
      .spyOn(swapsUtil, 'fetchAggregatorMetadata')
      .mockImplementation(() => [] as any);

    swapsUtilFetchTradesInfo = jest
      .spyOn(swapsUtil, 'fetchTradesInfo')
      .mockImplementation(() => API_TRADES as any);

    swapsUtilEstimateGas = jest
      .spyOn(swapsUtil, 'estimateGas')
      .mockImplementation(() => ({ gas: '0x5208', gasPrice: '0x5208' } as any));
  });

  afterEach(() => {
    fetchGasFeeEstimates.mockRestore();
    swapsUtilFetchTokens.mockRestore();
    swapsUtilFetchTopAssets.mockRestore();
    swapsUtilFetchAggregatorMetadata.mockRestore();
    swapsUtilFetchTradesInfo.mockRestore();
    swapsUtilEstimateGas.mockRestore();
  });

  it('should set default config', () => {
    expect(swapsController.config).toStrictEqual(swapsController.defaultConfig);
    expect(swapsController.config).toStrictEqual({
      chainId: '0x1',
      supportedChainIds: ['0x1', '0x38', '0x539', '0x89', '0xa86a'],
      maxGasLimit: 2500000,
      pollCountLimit: 3,
      fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
      fetchTokensThreshold: 1000 * 60 * 60 * 24,
      fetchTopAssetsThreshold: 1000 * 60 * 30,
      provider: undefined,
      clientId: undefined,
    });
  });

  it('should set default state', () => {
    expect(swapsController.state).toStrictEqual(swapsController.defaultState);
    expect(swapsController.state).toStrictEqual({
      quotes: {},
      quoteValues: {},
      fetchParams: {
        slippage: 0,
        sourceToken: '',
        sourceAmount: 0,
        destinationToken: '',
        walletAddress: '',
      },
      fetchParamsMetaData: {
        sourceTokenInfo: {
          decimals: 0,
          address: '',
          symbol: '',
        },
        destinationTokenInfo: {
          decimals: 0,
          address: '',
          symbol: '',
        },
      },
      topAggSavings: null,
      aggregatorMetadata: null,
      tokens: null,
      topAssets: null,
      approvalTransaction: null,
      aggregatorMetadataLastFetched: 0,
      quotesLastFetched: 0,
      topAssetsLastFetched: 0,
      error: { description: null, key: null },
      topAggId: null,
      tokensLastFetched: 0,
      isInPolling: false,
      pollingCyclesLeft: 3,
      quoteRefreshSeconds: null,
      usedGasEstimate: null,
      usedCustomGas: null,
      chainCache: {
        '0x1': {
          aggregatorMetadataLastFetched: 0,
          tokensLastFetched: 0,
          topAssetsLastFetched: 0,
          aggregatorMetadata: null,
          tokens: null,
          topAssets: null,
        },
      },
    });
  });

  describe('provider', () => {
    it('should set provider', () => {
      const provider = {
        name: 'test',
        type: 'test',
        chainId: '0x1',
        rpcUrl: 'test',
      };
      expect(swapsController.defaultConfig.provider).toBeUndefined();
      swapsController.configure({
        provider,
      });
      expect(swapsController.defaultConfig.provider.name).toBe(provider.name);
    });
  });

  describe('chain cache', () => {
    it('should update cache configuration', () => {
      expect(swapsController.config).toMatchObject({
        fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
        fetchTokensThreshold: 1000 * 60 * 60 * 24,
        fetchTopAssetsThreshold: 1000 * 60 * 30,
      });

      swapsController.configure({
        fetchAggregatorMetadataThreshold: 0,
        fetchTokensThreshold: 0,
        fetchTopAssetsThreshold: 0,
      });

      expect(swapsController.config).toMatchObject({
        fetchAggregatorMetadataThreshold: 0,
        fetchTokensThreshold: 0,
        fetchTopAssetsThreshold: 0,
      });
    });

    it('should update chainId configuration', () => {
      swapsController.configure({ chainId: '0x23' });
      expect(swapsController.config.chainId).toBe('0x23');

      swapsController.configure({ chainId: '0x24' });
      expect(swapsController.config.chainId).toBe('0x24');

      swapsController.configure({ chainId: '0x291' });
      expect(swapsController.config.chainId).toBe('0x291');
    });

    it('should create default cache for supported chainIds', () => {
      swapsController.configure({
        supportedChainIds: ['0x23', '0x24', '0x291'],
      });
      swapsController.configure({ chainId: '0x23' });
      expect(swapsController.state.chainCache['0x23']).toStrictEqual(
        INITIAL_CHAIN_DATA,
      );

      swapsController.configure({ chainId: '0x24' });
      expect(swapsController.state.chainCache['0x24']).toStrictEqual(
        INITIAL_CHAIN_DATA,
      );

      swapsController.configure({ chainId: '0x291' });
      expect(swapsController.state.chainCache['0x291']).toStrictEqual(
        INITIAL_CHAIN_DATA,
      );
    });

    it('should not create default cache for supported chainIds', () => {
      swapsController.configure({ chainId: '0x23' });
      expect(swapsController.state.chainCache['0x23']).toBeUndefined();

      swapsController.configure({ chainId: '0x24' });
      expect(swapsController.state.chainCache['0x24']).toBeUndefined();

      swapsController.configure({ chainId: '0x291' });
      expect(swapsController.state.chainCache['0x291']).toBeUndefined();
    });

    it('should load existing cache for chainId', () => {
      const chainData23 = {
        ...INITIAL_CHAIN_DATA,
        tokensLastFetched: 231,
        topAssetsLastFetched: 232,
        aggregatorMetadataLastFetched: 233,
      };
      const chainData24 = {
        ...INITIAL_CHAIN_DATA,
        tokensLastFetched: 241,
        topAssetsLastFetched: 242,
        aggregatorMetadataLastFetched: 243,
      };
      const chainData0x123 = {
        ...INITIAL_CHAIN_DATA,
        tokensLastFetched: 2911,
        topAssetsLastFetched: 2912,
        aggregatorMetadataLastFetched: 2913,
      };

      swapsController.update({
        chainCache: {
          '0x23': chainData23,
          '0x24': chainData24,
          '0x291': chainData0x123,
        },
      });

      swapsController.configure({ chainId: '0x23' });
      expect(swapsController.state.chainCache['0x23']).toStrictEqual(
        chainData23,
      );

      swapsController.configure({ chainId: '0x24' });
      expect(swapsController.state.chainCache['0x24']).toStrictEqual(
        chainData24,
      );

      swapsController.configure({ chainId: '0x291' });
      expect(swapsController.state.chainCache['0x291']).toStrictEqual(
        chainData0x123,
      );
    });
  });

  describe('tokens cache', () => {
    it('should fetch tokens when no tokens in state', async () => {
      swapsController.state.tokens = null;
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should fetch tokens when last fetched is 0', async () => {
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = 0;
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should fetch tokens when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.configure({ fetchTokensThreshold: threshold });
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = Date.now() - threshold - 1;
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should not fetch tokens when no threshold reached', async () => {
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = Date.now();
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });

    it('should not fetch tokens when no threshold reached or tokens are available', async () => {
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = Date.now();
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });

    it('should set tokensLastFetched to 0 when fetchTokens throws', async () => {
      swapsUtilFetchTokens.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.configure({ fetchTokensThreshold: threshold });
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = Date.now() - threshold - 1;
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
      expect(swapsController.state.tokensLastFetched).toBe(0);
    });

    it('should not fetch tokens if chain id is not supported', async () => {
      swapsController.configure({
        supportedChainIds: ['0x1'],
      });
      swapsController.state.tokens = [];
      swapsController.state.tokensLastFetched = 0;
      swapsController.configure({ chainId: '0x2' });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });
  });

  describe('top assets cache', () => {
    it('should fetch top assets when no top assets in state', async () => {
      swapsController.state.topAssets = null;
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should fetch top assets when last fetched is 0', async () => {
      swapsController.state.topAssets = [];
      swapsController.state.topAssetsLastFetched = 0;
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should fetch top assets when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.configure({ fetchTopAssetsThreshold: threshold });
      swapsController.state.topAssets = [];
      swapsController.state.topAssetsLastFetched = Date.now() - threshold - 1;
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should not fetch top assets when no threshold reached', async () => {
      swapsController.state.topAssets = [];
      swapsController.state.topAssetsLastFetched = Date.now();
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
    });

    it('should not fetch top assets when no threshold reached or tokens are available', async () => {
      swapsController.state.topAssets = [];
      swapsController.state.topAssetsLastFetched = Date.now();
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
    });

    it('should set topAssetsLastFetched to 0 when fetchTopAssets throws', async () => {
      swapsUtilFetchTopAssets.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.configure({ fetchTopAssetsThreshold: threshold });
      swapsController.state.topAssets = [];
      swapsController.state.topAssetsLastFetched = Date.now() - threshold - 1;
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
      expect(swapsController.state.topAssetsLastFetched).toBe(0);
    });
  });

  describe('aggregator metadata cache', () => {
    it('should fetch aggregator metadata when no aggregator metadata in state', async () => {
      swapsController.state.aggregatorMetadata = null;
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should fetch aggregator metadata when last fetched is 0', async () => {
      swapsController.state.aggregatorMetadata = {};
      swapsController.state.aggregatorMetadataLastFetched = 0;
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should fetch aggregator metadata when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.configure({
        fetchAggregatorMetadataThreshold: threshold,
      });
      swapsController.state.aggregatorMetadata = {};
      swapsController.state.aggregatorMetadataLastFetched =
        Date.now() - threshold - 1;
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should not fetch aggregator metadata when no threshold reached', async () => {
      swapsController.state.aggregatorMetadata = {};
      swapsController.state.aggregatorMetadataLastFetched = Date.now();
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
    });

    it('should not fetch aggregator metadata when no threshold reached or tokens are available', async () => {
      swapsController.state.aggregatorMetadata = {};
      swapsController.state.aggregatorMetadataLastFetched = Date.now();
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
    });

    it('should set aggregatorMetadataLastFetched to 0 when fetchAggregatorMetadata throws', async () => {
      swapsUtilFetchAggregatorMetadata.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.configure({
        fetchAggregatorMetadataThreshold: threshold,
      });
      swapsController.state.aggregatorMetadata = {};
      swapsController.state.aggregatorMetadataLastFetched =
        Date.now() - threshold - 1;
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
      expect(swapsController.state.aggregatorMetadataLastFetched).toBe(0);
    });
  });
  describe('updateQuotesWithGasPrice', () => {
    it('should update quotes with custom gas price', () => {
      const customGasFee = {
        gasPrice: '10',
      };
      const usedGasEstimate = {
        gasPrice: '20',
      };

      swapsController.state.quotes = API_TRADES;
      swapsController.state.usedGasEstimate = usedGasEstimate;

      swapsController.updateQuotesWithGasPrice(customGasFee);

      const updatedQuoteValues = swapsController.state.quoteValues!;
      expect(updatedQuoteValues.paraswap.maxEthFee).toBeDefined();
    });

    it('should not update quotes if usedGasEstimate is null', () => {
      const customGasFee = {
        gasPrice: '10',
      };
      swapsController.state.usedGasEstimate = null;

      swapsController.updateQuotesWithGasPrice(customGasFee);

      const updatedQuoteValues = swapsController.state.quoteValues;
      expect(updatedQuoteValues).toStrictEqual({});
    });
  });
  describe('updateSelectedQuoteWithGasLimit', () => {
    it('should update selected quote with custom gas limit', () => {
      const customGasLimit = '0x5208'; // 21000 in hex
      swapsController.state.topAggId = 'paraswap';
      swapsController.state.quotes = API_TRADES;
      swapsController.state.quoteValues = {
        paraswap: {
          ...swapsController.state.quoteValues!.paraswap,
          maxEthFee: '0',
        },
      };
      swapsController.state.usedGasEstimate = {
        gasPrice: '20',
      };

      swapsController.updateSelectedQuoteWithGasLimit(customGasLimit);

      const updatedQuoteValues = swapsController.state.quoteValues;
      expect(updatedQuoteValues?.paraswap.maxEthFee).toBeDefined();
    });

    it('should not update selected quote if topAggId or usedGasEstimate is null', () => {
      const customGasLimit = '0x5208'; // 21000 in hex
      swapsController.state.topAggId = null;
      swapsController.state.usedGasEstimate = null;

      swapsController.updateSelectedQuoteWithGasLimit(customGasLimit);

      const updatedQuoteValues = swapsController.state.quoteValues;
      expect(updatedQuoteValues).toStrictEqual({});
    });
  });
  describe('startFetchAndSetQuotes', () => {
    it('should set fetch parameters and initiate polling', () => {
      const fetchParams = {
        slippage: 1,
        sourceToken: '0x1',
        sourceAmount: 1000,
        destinationToken: '0x2',
        walletAddress: '0x3',
      };
      const fetchParamsMetaData = {
        sourceTokenInfo: {
          decimals: 18,
          address: '0x1',
          symbol: 'TOKEN1',
        },
        destinationTokenInfo: {
          decimals: 18,
          address: '0x2',
          symbol: 'TOKEN2',
        },
      };

      swapsController.startFetchAndSetQuotes(fetchParams, fetchParamsMetaData);

      expect(swapsController.state.fetchParams).toEqual(fetchParams);
      expect(swapsController.state.fetchParamsMetaData).toEqual(
        fetchParamsMetaData,
      );
      expect(swapsController.state.isInPolling).toBe(true);
    });
    // should return null if no fetch parameters are provided
    it('should return null if no fetch parameters are provided', () => {
      swapsController.startFetchAndSetQuotes();

      expect(swapsController.state.isInPolling).toBe(false);
    });
  });
  describe('stopPollingAndResetState', () => {
    it('should stop polling and reset state with error', () => {
      const error = {
        key: swapsUtil.SwapsError.QUOTES_NOT_AVAILABLE_ERROR,
        description: 'Test error description',
      };

      swapsController.stopPollingAndResetState(error);

      expect(swapsController.state.isInPolling).toBe(false);
      expect(swapsController.state.error).toEqual(error);
      expect(swapsController.state.quotes).toEqual({});
      expect(swapsController.state.quoteValues).toEqual({});
    });

    it('should stop polling and reset state without error', () => {
      swapsController.stopPollingAndResetState();

      expect(swapsController.state.isInPolling).toBe(false);
      expect(swapsController.state.error).toEqual({
        key: null,
        description: null,
      });
      expect(swapsController.state.quotes).toEqual({});
      expect(swapsController.state.quoteValues).toEqual({});
    });
  });
});
