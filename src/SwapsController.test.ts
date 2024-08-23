import { ChainId } from '@metamask/controller-utils';
import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import SwapsController from './SwapsController';
import { Quote, SwapsControllerMessenger } from './types';
import * as swapsUtil from './swapsUtil';
import { Provider } from '@metamask/network-controller';

const INITIAL_CONTROLLER_OPTIONS = {
  pollCountLimit: 3,
  fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
  fetchTokensThreshold: 1000 * 60 * 60 * 24,
  fetchTopAssetsThreshold: 1000 * 60 * 30,
  chainId: swapsUtil.ETH_CHAIN_ID,
  supportedChainIds: [
    swapsUtil.ETH_CHAIN_ID,
    swapsUtil.BSC_CHAIN_ID,
    swapsUtil.SWAPS_TESTNET_CHAIN_ID,
    swapsUtil.POLYGON_CHAIN_ID,
    swapsUtil.AVALANCHE_CHAIN_ID,
  ],
  clientId: undefined,
};

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
      total: '0',
      performance: '0',
      fee: '0',
      medianMetaMaskFee: '0',
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
      total: '0',
      performance: '0',
      fee: '0',
      medianMetaMaskFee: '0',
    },
    gasEstimate: '100000',
    gasEstimateWithRefund: '90000',
    destinationTokenRate: 0.9999999999999999,
    sourceTokenRate: 1.0000000000000002,
    multiLayerL1TradeFeeTotal: '0',
  },
};

// Create a single mock object
const messengerMock = {
  call: jest.fn(),
  registerActionHandler: jest.fn(),
  registerInitialEventPayload: jest.fn(),
  publish: jest.fn(),
} as unknown as jest.Mocked<SwapsControllerMessenger>;

jest.mock('@metamask/eth-query', () =>
  jest.fn().mockImplementation(() => {
    return {
      estimateGas: (_transaction: any, callback: any) => {
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
    fetchEstimatedMultiLayerL1Fee = jest.fn().mockImplementation(() => '0x0');

    swapsController = new SwapsController(
      {
        ...INITIAL_CONTROLLER_OPTIONS,
        messenger: messengerMock,
        // TODO: Remove once GasFeeController exports this action type
        fetchGasFeeEstimates,
        fetchEstimatedMultiLayerL1Fee,
      },
      swapsUtil.getDefaultSwapsControllerState(),
    );

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

  it('should set default options', () => {
    expect(swapsController.__test__getInternal('#chainId')).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.chainId,
    );
    expect(
      swapsController.__test__getInternal('#supportedChainIds'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.supportedChainIds);
    expect(
      swapsController.__test__getInternal('#pollCountLimit'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.pollCountLimit);
    expect(
      swapsController.__test__getInternal('#fetchAggregatorMetadataThreshold'),
    ).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.fetchAggregatorMetadataThreshold,
    );
    expect(
      swapsController.__test__getInternal('#fetchTokensThreshold'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.fetchTokensThreshold);
    expect(
      swapsController.__test__getInternal('#fetchTopAssetsThreshold'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.fetchTopAssetsThreshold);
    expect(swapsController.__test__getInternal('#clientId')).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.clientId,
    );
    expect(swapsController.__test__getInternal('#fetchGasFeeEstimates')).toBe(
      fetchGasFeeEstimates,
    );
    expect(
      swapsController.__test__getInternal('#fetchEstimatedMultiLayerL1Fee'),
    ).toBe(fetchEstimatedMultiLayerL1Fee);
  });

  it('should set default state', () => {
    expect(swapsController.state).toStrictEqual(
      swapsUtil.getDefaultSwapsControllerState(),
    );
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

  it('should set default options if not present', () => {
    swapsController = new SwapsController(
      {
        messenger: messengerMock,
        fetchGasFeeEstimates,
        fetchEstimatedMultiLayerL1Fee,
      },
      {},
    );

    expect(swapsController.__test__getInternal('#chainId')).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.chainId,
    );
    expect(
      swapsController.__test__getInternal('#supportedChainIds'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.supportedChainIds);
    expect(
      swapsController.__test__getInternal('#pollCountLimit'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.pollCountLimit);
    expect(
      swapsController.__test__getInternal('#fetchAggregatorMetadataThreshold'),
    ).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.fetchAggregatorMetadataThreshold,
    );
    expect(
      swapsController.__test__getInternal('#fetchTokensThreshold'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.fetchTokensThreshold);
    expect(
      swapsController.__test__getInternal('#fetchTopAssetsThreshold'),
    ).toStrictEqual(INITIAL_CONTROLLER_OPTIONS.fetchTopAssetsThreshold);
    expect(swapsController.__test__getInternal('#clientId')).toStrictEqual(
      INITIAL_CONTROLLER_OPTIONS.clientId,
    );
  });

  it('should set a default value for pollingCyclesLeft', () => {
    swapsController = new SwapsController(
      {
        ...INITIAL_CONTROLLER_OPTIONS,
        messenger: messengerMock,
        fetchGasFeeEstimates,
        fetchEstimatedMultiLayerL1Fee,
      },
      {},
    );
    expect(swapsController.state.pollingCyclesLeft).toBe(3);
  });

  it('should use swapsUtil.INITIAL_CHAIN_DATA when chainCache does not have data for the chainId', () => {
    const chainId = ChainId.aurora;

    swapsController.__test__updatePrivate('#supportedChainIds', [chainId]);

    // add to supportedChainIds, clear chainCache and set chainId
    swapsController.__test__updateState({
      chainCache: {},
    });

    swapsController.setChainId(chainId);

    const cachedData = swapsController.state.chainCache[chainId];
    expect(cachedData).toEqual(swapsUtil.INITIAL_CHAIN_DATA);
  });

  describe('provider', () => {
    it('should set provider', () => {
      const provider = {
        name: 'test',
        type: 'test',
        chainId: '0x1',
        rpcUrl: 'test',
      } as unknown as Provider;

      expect(swapsController.__test__getInternal('#web3')).toBeUndefined();
      expect(swapsController.__test__getInternal('#ethQuery')).toBeUndefined();

      swapsController.setProvider(provider);

      expect(swapsController.__test__getInternal('#web3')).toBeDefined();
      expect(swapsController.__test__getInternal('#ethQuery')).toBeDefined();
    });
  });

  describe('provider', () => {
    it('should set provider with options', () => {
      const provider = {
        name: 'test',
        type: 'test',
        chainId: '0x1',
        rpcUrl: 'test',
      } as unknown as Provider;

      expect(swapsController.__test__getInternal('#web3')).toBeUndefined();
      expect(swapsController.__test__getInternal('#ethQuery')).toBeUndefined();

      swapsController.setProvider(provider, {
        chainId: '0x23',
        pollCountLimit: 10,
      });

      expect(swapsController.__test__getInternal('#web3')).toBeDefined();
      expect(swapsController.__test__getInternal('#ethQuery')).toBeDefined();
      expect(swapsController.__test__getInternal('#chainId')).toBe('0x23');
      expect(swapsController.__test__getInternal('#pollCountLimit')).toBe(10);
    });
  });

  describe('chain cache', () => {
    it('should update chainId configuration', () => {
      swapsController.__test__updatePrivate('#supportedChainIds', [
        '0x23',
        '0x24',
        '0x291',
      ]);
      swapsController.setChainId('0x23');
      expect(swapsController.__test__getInternal('#chainId')).toBe('0x23');

      swapsController.setChainId('0x24');
      expect(swapsController.__test__getInternal('#chainId')).toBe('0x24');

      swapsController.setChainId('0x291');
      expect(swapsController.__test__getInternal('#chainId')).toBe('0x291');
    });

    it('should create default cache for supported chainIds', () => {
      swapsController.__test__updatePrivate('#supportedChainIds', [
        '0x23',
        '0x24',
        '0x291',
      ]);
      swapsController.setChainId('0x23');
      expect(swapsController.state.chainCache['0x23']).toStrictEqual(
        swapsUtil.INITIAL_CHAIN_DATA,
      );

      swapsController.setChainId('0x24');
      expect(swapsController.state.chainCache['0x24']).toStrictEqual(
        swapsUtil.INITIAL_CHAIN_DATA,
      );

      swapsController.setChainId('0x291');
      expect(swapsController.state.chainCache['0x291']).toStrictEqual(
        swapsUtil.INITIAL_CHAIN_DATA,
      );
    });

    it('should not create default cache for unsupported chainIds', () => {
      swapsController.setChainId('0x23');
      expect(swapsController.state.chainCache['0x23']).toBeUndefined();

      swapsController.setChainId('0x24');
      expect(swapsController.state.chainCache['0x24']).toBeUndefined();

      swapsController.setChainId('0x291');
      expect(swapsController.state.chainCache['0x291']).toBeUndefined();
    });

    it('should load existing cache for chainId', () => {
      swapsController.__test__updatePrivate('#supportedChainIds', [
        '0x23',
        '0x24',
        '0x291',
      ]);

      const chainData23 = {
        ...swapsUtil.INITIAL_CHAIN_DATA,
        tokensLastFetched: 231,
        topAssetsLastFetched: 232,
        aggregatorMetadataLastFetched: 233,
      };
      const chainData24 = {
        ...swapsUtil.INITIAL_CHAIN_DATA,
        tokensLastFetched: 241,
        topAssetsLastFetched: 242,
        aggregatorMetadataLastFetched: 243,
      };
      const chainData0x123 = {
        ...swapsUtil.INITIAL_CHAIN_DATA,
        tokensLastFetched: 2911,
        topAssetsLastFetched: 2912,
        aggregatorMetadataLastFetched: 2913,
      };

      swapsController.__test__updateState({
        chainCache: {
          '0x23': chainData23,
          '0x24': chainData24,
          '0x291': chainData0x123,
        },
      });

      swapsController.setChainId('0x23');
      expect(swapsController.state.chainCache['0x23']).toStrictEqual(
        chainData23,
      );

      swapsController.setChainId('0x24');
      expect(swapsController.state.chainCache['0x24']).toStrictEqual(
        chainData24,
      );

      swapsController.setChainId('0x291');
      expect(swapsController.state.chainCache['0x291']).toStrictEqual(
        chainData0x123,
      );
    });
  });

  describe('tokens cache', () => {
    it('should fetch tokens when no tokens in state', async () => {
      swapsController.__test__updateState({
        tokens: [],
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should fetch tokens when last fetched is 0', async () => {
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: 0,
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should fetch tokens when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.__test__updatePrivate('#fetchTokensThreshold', threshold);
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
    });

    it('should not fetch tokens when no threshold reached', async () => {
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: Date.now(),
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });

    it('should not fetch tokens when no threshold reached or tokens are available', async () => {
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: Date.now(),
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });

    it('should set tokensLastFetched to 0 when fetchTokens throws', async () => {
      swapsUtilFetchTokens.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.__test__updatePrivate('#fetchTokensThreshold', threshold);
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).toHaveBeenCalled();
      expect(swapsController.state.tokensLastFetched).toBe(0);
    });

    it('should not fetch tokens if chain id is not supported', async () => {
      swapsController.__test__updateState({
        tokens: [],
        tokensLastFetched: 0,
      });
      swapsController.__test__updatePrivate('#supportedChainIds', ['0x1']);
      swapsController.setChainId('0x2');

      await swapsController.fetchTokenWithCache();
      expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
    });
  });

  describe('top assets cache', () => {
    it('should fetch top assets when no top assets in state', async () => {
      swapsController.__test__updateState({
        topAssets: null,
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should fetch top assets when last fetched is 0', async () => {
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: 0,
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should fetch top assets when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.__test__updatePrivate(
        '#fetchTopAssetsThreshold',
        threshold,
      );
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
    });

    it('should not fetch top assets when no threshold reached', async () => {
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: Date.now(),
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
    });

    it('should not fetch top assets when no threshold reached or tokens are available', async () => {
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: Date.now(),
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
    });

    it('should set topAssetsLastFetched to 0 when fetchTopAssets throws', async () => {
      swapsUtilFetchTopAssets.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.__test__updatePrivate(
        '#fetchTopAssetsThreshold',
        threshold,
      );
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).toHaveBeenCalled();
      expect(swapsController.state.topAssetsLastFetched).toBe(0);
    });

    it('should return undefined if chain id is not supported', async () => {
      swapsController.__test__updatePrivate('#supportedChainIds', ['0x1']);
      swapsController.__test__updateState({
        topAssets: [],
        topAssetsLastFetched: 0,
      });

      swapsController.setChainId('0x2');
      await swapsController.fetchTopAssetsWithCache();
      expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
    });
  });

  describe('aggregator metadata cache', () => {
    it('should fetch aggregator metadata when no aggregator metadata in state', async () => {
      swapsController.__test__updateState({
        aggregatorMetadata: null,
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should fetch aggregator metadata when last fetched is 0', async () => {
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: 0,
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should fetch aggregator metadata when last fetched is over threshold', async () => {
      const threshold = 5000;
      swapsController.__test__updatePrivate(
        '#fetchAggregatorMetadataThreshold',
        threshold,
      );
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
    });

    it('should not fetch aggregator metadata when no threshold reached', async () => {
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: Date.now(),
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
    });

    it('should not fetch aggregator metadata when no threshold reached or tokens are available', async () => {
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: Date.now(),
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
    });

    it('should set aggregatorMetadataLastFetched to 0 when fetchAggregatorMetadata throws', async () => {
      swapsUtilFetchAggregatorMetadata.mockImplementation(() => {
        throw new Error();
      });
      const threshold = 5000;
      swapsController.__test__updatePrivate(
        '#fetchAggregatorMetadataThreshold',
        threshold,
      );
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: Date.now() - threshold - 1,
      });
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).toHaveBeenCalled();
      expect(swapsController.state.aggregatorMetadataLastFetched).toBe(0);
    });
    it('should return undefined if chain id is not supported', async () => {
      swapsController.__test__updatePrivate('#supportedChainIds', ['0x1']);
      swapsController.__test__updateState({
        aggregatorMetadata: {},
        aggregatorMetadataLastFetched: 0,
      });
      swapsController.setChainId('0x2');
      await swapsController.fetchAggregatorMetadataWithCache();
      expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
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

      swapsController.__test__updateState({
        quotes: API_TRADES,
        usedGasEstimate,
      });

      swapsController.updateQuotesWithGasPrice(customGasFee);

      const updatedQuoteValues = swapsController.state.quoteValues!;
      expect(updatedQuoteValues.paraswap.maxEthFee).toBeDefined();
    });

    it('should not update quotes if usedGasEstimate is null', () => {
      const customGasFee = {
        gasPrice: '10',
      };

      swapsController.__test__updateState({
        usedGasEstimate: null,
      });

      swapsController.updateQuotesWithGasPrice(customGasFee);

      const updatedQuoteValues = swapsController.state.quoteValues;
      expect(updatedQuoteValues).toStrictEqual({});
    });
  });
  describe('updateSelectedQuoteWithGasLimit', () => {
    it('should update selected quote with custom gas limit', () => {
      const customGasLimit = '0x5208'; // 21000 in hex

      swapsController.__test__updateState({
        topAggId: 'paraswap',
        quotes: API_TRADES,
        quoteValues: {
          paraswap: {
            ...swapsController.state.quoteValues!.paraswap,
            maxEthFee: '0',
          },
        },
        usedGasEstimate: {
          gasPrice: '20',
        },
      });

      swapsController.updateSelectedQuoteWithGasLimit(customGasLimit);

      const updatedQuoteValues = swapsController.state.quoteValues;
      expect(updatedQuoteValues?.paraswap.maxEthFee).toBeDefined();
    });

    it('should not update selected quote if topAggId or usedGasEstimate is null', () => {
      const customGasLimit = '0x5208'; // 21000 in hex

      swapsController.__test__updateState({
        topAggId: null,
        usedGasEstimate: null,
      });

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

    it('should clear timeout if this.#handle is set', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      swapsController.__test__updatePrivate(
        '#handle',
        setTimeout(() => {}, 1000),
      );

      swapsController.stopPollingAndResetState();

      expect(clearTimeoutSpy).toHaveBeenCalledWith(
        swapsController.__test__getInternal('#handle'),
      );
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('getGasPrice', () => {
    let swapsController: SwapsController;

    beforeEach(() => {
      fetchGasFeeEstimates = jest.fn().mockImplementation(() => ({
        gasFeeEstimates: {
          high: {
            suggestedMaxFeePerGas: '100',
            suggestedMaxPriorityFeePerGas: '10',
          },
          medium: '20',
          low: '5',
          estimatedBaseFee: '50',
        },
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'fee-market',
      }));

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );
    });

    it('should fetch gas price using fetchGasFeeEstimates', async () => {
      // @ts-expect-error - testing private method
      const gasPriceEstimate = await swapsController.getGasPrice();
      expect(gasPriceEstimate).toEqual({
        high: {
          suggestedMaxFeePerGas: '100',
          suggestedMaxPriorityFeePerGas: '10',
        },
        low: '5',
        medium: '20',
        estimatedBaseFee: '50',
      });
    });

    it('should throw error if gas fee estimates are not available', async () => {
      fetchGasFeeEstimates = jest.fn().mockImplementation(() => ({
        gasFeeEstimates: {},
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'none',
      }));

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );

      // @ts-expect-error - testing private method
      await expect(swapsController.getGasPrice()).rejects.toThrow(
        swapsUtil.SwapsError.SWAPS_GAS_PRICE_ESTIMATION,
      );
    });

    it('should fetch gas price from fetchGasPrices if fetchGasFeeEstimates is not defined', async () => {
      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates: undefined,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );

      const fetchGasPricesSpy = jest
        .spyOn(swapsUtil, 'fetchGasPrices')
        .mockResolvedValue({
          proposedGasPrice: '100',
          safeGasPrice: '50',
          fastGasPrice: '150',
        });

      // @ts-expect-error - testing private method
      const gasPrice = await swapsController.getGasPrice();
      expect(gasPrice).toEqual({ gasPrice: '100' });
      fetchGasPricesSpy.mockRestore();
    });
  });

  describe('calculateQuoteValues', () => {
    let swapsController: SwapsController;

    beforeEach(() => {
      fetchGasFeeEstimates = jest.fn().mockImplementation(() => ({
        gasFeeEstimates: {
          high: {
            suggestedMaxFeePerGas: '100',
            suggestedMaxPriorityFeePerGas: '10',
          },
          medium: '20',
          low: '5',
          estimatedBaseFee: '50',
        },
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'fee-market',
      }));

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );
    });

    it('should calculate quote values for Fee Market gas estimate type', () => {
      const quote = API_TRADES.paraswap;

      // @ts-expect-error - incomplete type
      const gasFeeEstimates = {
        high: {
          suggestedMaxFeePerGas: '100',
          suggestedMaxPriorityFeePerGas: '10',
        },
        medium: '20',
        low: '5',
        estimatedBaseFee: '50',
      } as GasFeeEstimates;

      // @ts-expect-error - testing private method
      const quoteValues = swapsController.calculateQuoteValues(
        quote,
        null,
        gasFeeEstimates,
      );

      expect(quoteValues).toHaveProperty('aggregator', 'paraswap');
      expect(quoteValues).toHaveProperty('tradeGasLimit');
      expect(quoteValues).toHaveProperty('tradeMaxGasLimit');
      expect(quoteValues).toHaveProperty('ethFee');
      expect(quoteValues).toHaveProperty('maxEthFee');
      expect(quoteValues).toHaveProperty('ethValueOfTokens');
      expect(quoteValues).toHaveProperty('overallValueOfQuote');
      expect(quoteValues).toHaveProperty('metaMaskFeeInEth');
    });

    it('should calculate quote values for Legacy gas estimate type', () => {
      const quote = API_TRADES.paraswap;

      const gasFeeEstimates = {
        gasPrice: '100',
      };

      // @ts-expect-error - testing private method
      const quoteValues = swapsController.calculateQuoteValues(
        quote,
        null,
        gasFeeEstimates,
      );

      expect(quoteValues).toHaveProperty('aggregator', 'paraswap');
      expect(quoteValues).toHaveProperty('tradeGasLimit');
      expect(quoteValues).toHaveProperty('tradeMaxGasLimit');
      expect(quoteValues).toHaveProperty('ethFee');
      expect(quoteValues).toHaveProperty('maxEthFee');
      expect(quoteValues).toHaveProperty('ethValueOfTokens');
      expect(quoteValues).toHaveProperty('overallValueOfQuote');
      expect(quoteValues).toHaveProperty('metaMaskFeeInEth');
    });

    it('should calculate quote values with custom gas fee', () => {
      const quote = API_TRADES.paraswap;

      const gasFeeEstimates = fetchGasFeeEstimates();

      const customGasFee = {
        maxFeePerGas: '200',
        maxPriorityFeePerGas: '20',
        estimatedBaseFee: '100',
      };

      // @ts-expect-error - testing private method
      const quoteValues = swapsController.calculateQuoteValues(
        quote,
        null,
        gasFeeEstimates,
        customGasFee,
      );

      expect(quoteValues).toHaveProperty('aggregator', 'paraswap');
      expect(quoteValues).toHaveProperty('tradeGasLimit');
      expect(quoteValues).toHaveProperty('tradeMaxGasLimit');
      expect(quoteValues).toHaveProperty('ethFee');
      expect(quoteValues).toHaveProperty('maxEthFee');
      expect(quoteValues).toHaveProperty('ethValueOfTokens');
      expect(quoteValues).toHaveProperty('overallValueOfQuote');
      expect(quoteValues).toHaveProperty('metaMaskFeeInEth');
    });
  });

  describe('calculatesCustomLimitMaxEthFee', () => {
    let swapsController: SwapsController;

    beforeEach(() => {
      fetchGasFeeEstimates = jest.fn().mockImplementation(() => ({
        gasFeeEstimates: {
          high: {
            suggestedMaxFeePerGas: '100',
            suggestedMaxPriorityFeePerGas: '10',
          },
          medium: '20',
          low: '5',
          estimatedBaseFee: '50',
        },
        estimatedGasFeeTimeBounds: {},
        gasEstimateType: 'fee-market',
      }));

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );
    });

    it('should calculate maxEthFee for Fee Market gas estimate type', () => {
      const quote = API_TRADES.paraswap;

      // @ts-expect-error - incomplete type
      const gasFeeEstimates = {
        high: {
          suggestedMaxFeePerGas: '100',
          suggestedMaxPriorityFeePerGas: '10',
        },
        medium: '20',
        low: '5',
        estimatedBaseFee: '50',
      } as GasFeeEstimates;

      const customGasLimit = '0x5208'; // 21000 in hex

      // @ts-expect-error - testing private method
      const maxEthFee = swapsController.calculatesCustomLimitMaxEthFee(
        quote,
        gasFeeEstimates,
        customGasLimit,
      );

      expect(maxEthFee).toBeDefined();
    });

    it('should calculate maxEthFee for Legacy gas estimate type', () => {
      const quote = API_TRADES.paraswap;

      const gasFeeEstimates = {
        gasPrice: '100',
      };

      const customGasLimit = '0x5208'; // 21000 in hex

      // @ts-expect-error - testing private method
      const maxEthFee = swapsController.calculatesCustomLimitMaxEthFee(
        quote,
        gasFeeEstimates,
        customGasLimit,
      );

      expect(maxEthFee).toBeDefined();
    });

    it('should calculate maxEthFee with custom gas fee', () => {
      const quote = API_TRADES.paraswap;

      const customGasFee = {
        maxFeePerGas: '200',
        maxPriorityFeePerGas: '20',
        estimatedBaseFee: '100',
      };

      const customGasLimit = '0x5208'; // 21000 in hex

      // @ts-expect-error - testing private method
      const maxEthFee = swapsController.calculatesCustomLimitMaxEthFee(
        quote,
        customGasFee,
        customGasLimit,
      );

      expect(maxEthFee).toBeDefined();
    });
  });

  describe('isGasFeeStateEthGasPrice', () => {
    beforeEach(() => {
      fetchGasFeeEstimates = jest.fn();

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );
    });

    it('should return true for GasFeeStateEthGasPrice object', () => {
      const gasFeeState = {
        gasEstimateType: 'eth_gasPrice',
        gasFeeEstimates: {
          gasPrice: '100',
        },
      };

      // @ts-expect-error - incomplete type
      const result = swapsUtil.isGasFeeStateEthGasPrice(gasFeeState);

      expect(result).toBe(true);
    });

    it('should return false for non-GasFeeStateEthGasPrice object', () => {
      const gasFeeState = {
        gasEstimateType: 'fee-market',
        gasFeeEstimates: {
          high: {
            suggestedMaxFeePerGas: '100',
            suggestedMaxPriorityFeePerGas: '10',
          },
        },
      };

      // @ts-expect-error - incomplete type
      const result = swapsUtil.isGasFeeStateEthGasPrice(gasFeeState);

      expect(result).toBe(false);
    });
  });

  describe('isGasFeeStateLegacy', () => {
    beforeEach(() => {
      fetchGasFeeEstimates = jest.fn();

      swapsController = new SwapsController(
        {
          ...INITIAL_CONTROLLER_OPTIONS,
          messenger: messengerMock,
          fetchGasFeeEstimates,
        },
        swapsUtil.getDefaultSwapsControllerState(),
      );
    });

    it('should return true for GasFeeStateLegacy object', () => {
      const gasFeeState = {
        gasEstimateType: 'legacy',
        gasFeeEstimates: {
          medium: '100',
        },
      };

      // @ts-expect-error - incomplete type
      const result = swapsUtil.isGasFeeStateLegacy(gasFeeState);

      expect(result).toBe(true);
    });

    it('should return false for non-GasFeeStateLegacy object', () => {
      const gasFeeState = {
        gasEstimateType: 'fee-market',
        gasFeeEstimates: {
          high: {
            suggestedMaxFeePerGas: '100',
            suggestedMaxPriorityFeePerGas: '10',
          },
        },
      };

      // @ts-expect-error - incomplete type
      const result = swapsUtil.isGasFeeStateLegacy(gasFeeState);

      expect(result).toBe(false);
    });

    it('should return false for invalid object', () => {
      const gasFeeState = {
        invalidKey: 'invalidValue',
      };

      // @ts-expect-error - incomplete type
      const result = swapsUtil.isGasFeeStateLegacy(gasFeeState);

      expect(result).toBe(false);
    });
  });
});
