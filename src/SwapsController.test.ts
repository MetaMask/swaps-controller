import { GasFeeEstimates } from '@metamask/gas-fee-controller';
import SwapsController from './SwapsController';
import {
  APIFetchQuotesMetadata,
  APIFetchQuotesParams,
  ChainData,
  Quote,
  SwapsControllerMessenger,
  SwapsControllerOptions,
  SwapsControllerState,
} from './types';
import * as swapsUtil from './swapsUtil';
import {
  NetworkClientId,
  NetworkControllerGetNetworkClientByIdAction,
  NetworkControllerNetworkDidChangeEvent,
} from '@metamask/network-controller';
import { FakeProvider } from './fake-provider.test';
import { Hex } from '@metamask/utils';
import { ControllerMessenger } from '@metamask/base-controller';
import * as ethQueryModule from '@metamask/eth-query';
import * as ethersContracts from '@ethersproject/contracts';
import * as ethersProviders from '@ethersproject/providers';
import { Interface } from '@ethersproject/abi';
import abiERC20 from 'human-standard-token-abi';

// Override this module so that its members can be spied on
jest.mock('@metamask/eth-query', () => {
  return {
    __esModule: true,
    default: jest.requireActual('@metamask/eth-query'),
  };
});

// Override this module so that its members can be spied on
jest.mock('@ethersproject/contracts', () => {
  return {
    ...jest.requireActual('@ethersproject/contracts'),
    __esModule: true,
  };
});

const originalSetTimeout = setTimeout;
const OriginalEthQuery = ethQueryModule.default;
const OriginalWeb3Provider = ethersProviders.Web3Provider;

const {
  ARBITRUM_CHAIN_ID,
  AVALANCHE_CHAIN_ID,
  BASE_CHAIN_ID,
  BSC_CHAIN_ID,
  CHAIN_ID_TO_NAME_MAP,
  ETH_CHAIN_ID,
  LINEA_CHAIN_ID,
  OPTIMISM_CHAIN_ID,
  POLYGON_CHAIN_ID,
  SWAPS_CONTRACT_ADDRESSES,
  SWAPS_TESTNET_CHAIN_ID,
  ZKSYNC_ERA_CHAIN_ID,
} = swapsUtil;

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
  subscribe: jest.fn(),
} as unknown as jest.Mocked<SwapsControllerMessenger>;

const networkControllerGetNetworkClientByIdCallbackMock = jest.fn();

function mockNetworkControllerGetNetworkClientById(
  networkClientsById: Record<
    NetworkClientId,
    {
      provider: FakeProvider;
      configuration: {
        chainId: Hex;
      };
    }
  >,
) {
  networkControllerGetNetworkClientByIdCallbackMock.mockImplementation(
    (networkClientId) => {
      const foundNetworkClient = networkClientsById[networkClientId];
      if (foundNetworkClient === undefined) {
        throw new Error(`Unknown network client ID '${networkClientId}'`);
      }
      return foundNetworkClient;
    },
  );
}

function buildAPIFetchQuotesParams(
  overrides: Partial<APIFetchQuotesParams> = {},
): APIFetchQuotesParams {
  return {
    slippage: 1,
    sourceToken: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    sourceAmount: 1000,
    destinationToken: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    walletAddress: '0xe18035bf8712672935fdb4e5e431b1a0183d2dfc',
    ...overrides,
  };
}

function buildAPIFetchQuotesMetadata(
  overrides: Partial<APIFetchQuotesMetadata> = {},
): APIFetchQuotesMetadata {
  return {
    sourceTokenInfo: {
      decimals: 18,
      address: '0x6b175474e89094c44da98b954eedeac495271d0f',
      symbol: 'TOKEN1',
    },
    destinationTokenInfo: {
      decimals: 18,
      address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
      symbol: 'TOKEN2',
    },
    networkClientId: 'ZZZZ-ZZZZ-ZZZZ-ZZZZ',
    ...overrides,
  };
}

function buildGasFeeEstimates(overrides: Partial<GasFeeEstimates> = {}) {
  return {
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
    ...overrides,
  };
}

function buildNetVersionRequestStub(chainId: Hex) {
  return {
    request: {
      method: 'net_version',
      params: [],
    },
    response: {
      result: chainId,
    },
  };
}

function buildErc20AllowanceCallStub(
  chainId: Hex,
  fetchParams: APIFetchQuotesParams,
  {
    contractAddress = fetchParams.sourceToken as Hex,
    walletAddress = fetchParams.walletAddress as Hex,
    allowance = '285604723479784',
  }: {
    contractAddress?: Hex;
    walletAddress?: Hex;
    allowance?: number | string;
  } = {},
) {
  const swapsContractAddress = SWAPS_CONTRACT_ADDRESSES[chainId];
  const iface = new Interface(abiERC20);
  const data = iface.encodeFunctionData('allowance', [
    walletAddress,
    swapsContractAddress,
  ]);
  const result = iface.encodeFunctionResult('allowance', [allowance]);

  return {
    request: {
      method: 'eth_call',
      params: [
        {
          to: contractAddress.toLowerCase(),
          data,
        },
        'latest',
      ],
    },
    response: {
      result,
    },
  };
}

describe('SwapsController', () => {
  /* Setup */
  let fetchGasFeeEstimates: jest.Mock;
  let fetchEstimatedMultiLayerL1Fee: jest.Mock;
  let getSwapsController: (args?: {
    options?: Partial<SwapsControllerOptions>;
    state?: Partial<SwapsControllerState>;
  }) => SwapsController;
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

    messengerMock.call.mockImplementation((actionName, ...args) => {
      if (actionName === 'NetworkController:getNetworkClientById') {
        return networkControllerGetNetworkClientByIdCallbackMock(...args);
      }
      return undefined;
    });

    getSwapsController = ({ options, state } = {}) => {
      return new SwapsController(
        {
          clientId: '1',
          messenger: messengerMock,
          // TODO: Remove once GasFeeController exports this action type
          fetchGasFeeEstimates,
          fetchEstimatedMultiLayerL1Fee,
          ...options,
        },
        state,
      );
    };

    swapsController = getSwapsController();

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
      .mockResolvedValue({
        paraswap: { ...API_TRADES.paraswap },
        oneInch: { ...API_TRADES.oneInch },
      } as any);

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

  describe('constructor', () => {
    it('initializes state with purely defaults when no initial state given', () => {
      const controller = getSwapsController();

      expect(controller.state).toStrictEqual({
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
          networkClientId: 'mainnet',
        },
        topAggSavings: null,
        aggregatorMetadata: null,
        tokens: null,
        topAssets: null,
        approvalTransaction: null,
        aggregatorMetadataLastFetched: 0,
        quotesLastFetched: 0,
        error: { key: null, description: null },
        topAggId: null,
        tokensLastFetched: 0,
        isInPolling: false,
        pollingCyclesLeft: 3,
        quoteRefreshSeconds: null,
        usedGasEstimate: null,
        usedCustomGas: null,
        chainCache: {
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
        },
      });
    });

    it('allows overriding any part of default state', () => {
      const controller = getSwapsController({
        state: {
          fetchParams: {
            slippage: 0,
            sourceToken: '0x12345',
            sourceAmount: 0,
            destinationToken: '',
            walletAddress: '0x99999',
          },
          quoteRefreshSeconds: 3,
        },
      });

      expect(controller.state).toStrictEqual({
        quotes: {},
        quoteValues: {},
        fetchParams: {
          slippage: 0,
          sourceToken: '0x12345',
          sourceAmount: 0,
          destinationToken: '',
          walletAddress: '0x99999',
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
          networkClientId: 'mainnet',
        },
        topAggSavings: null,
        aggregatorMetadata: null,
        tokens: null,
        topAssets: null,
        approvalTransaction: null,
        aggregatorMetadataLastFetched: 0,
        quotesLastFetched: 0,
        error: { key: null, description: null },
        topAggId: null,
        tokensLastFetched: 0,
        isInPolling: false,
        pollingCyclesLeft: 3,
        quoteRefreshSeconds: 3,
        usedGasEstimate: null,
        usedCustomGas: null,
        chainCache: {
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
        },
      });
    });
  });

  describe('on NetworkController:networkDidChange', () => {
    it('copies previously cached values for the new chain ID into the main part of state', async () => {
      const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
      const chainId = BSC_CHAIN_ID;
      const cachedData = {
        aggregatorMetadata: {
          test: {
            color: 'red',
            title: 'Title',
            icon: 'icon',
            iconPng: 'icon.png',
          },
        },
        tokens: [
          {
            address: '0x9999999',
            symbol: 'TOKEN9999',
            decimals: 9999,
          },
        ],
        topAssets: [
          {
            address: '0x9999999',
            symbol: 'TOKEN9999',
          },
        ],
        aggregatorMetadataLastFetched: 1,
        topAssetsLastFetched: 2,
        tokensLastFetched: 3,
      };
      const rootMessenger = new ControllerMessenger<
        NetworkControllerGetNetworkClientByIdAction,
        NetworkControllerNetworkDidChangeEvent
      >();
      rootMessenger.registerActionHandler(
        'NetworkController:getNetworkClientById',
        // @ts-expect-error Intentionally not providing a full
        // NetworkConfiguration object.
        (givenNetworkClientId) => {
          if (givenNetworkClientId === networkClientId) {
            return {
              configuration: {
                chainId,
              },
            };
          }
          throw new Error(
            `Unrecognized network client ID '${givenNetworkClientId}'`,
          );
        },
      );
      const swapsControllerMessenger = rootMessenger.getRestricted({
        name: 'SwapsController',
        allowedActions: ['NetworkController:getNetworkClientById'],
        allowedEvents: ['NetworkController:networkDidChange'],
      });
      const controller = getSwapsController({
        options: {
          messenger: swapsControllerMessenger,
        },
        state: {
          chainCache: {
            [chainId]: cachedData,
          },
        },
      });

      // @ts-expect-error Intentionally not providing full NetworkState object.
      rootMessenger.publish('NetworkController:networkDidChange', {
        selectedNetworkClientId: networkClientId,
      });

      // topAssetsLastFetched is not part of the state
      const { topAssetsLastFetched, ...rest } = cachedData;

      expect(controller.state).toMatchObject(rest);
    });

    it('clears the main part of state and initializes the cached data for the new chain ID if none previously existed', async () => {
      const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
      const chainId = BSC_CHAIN_ID;
      const rootMessenger = new ControllerMessenger<
        NetworkControllerGetNetworkClientByIdAction,
        NetworkControllerNetworkDidChangeEvent
      >();
      rootMessenger.registerActionHandler(
        'NetworkController:getNetworkClientById',
        // @ts-expect-error Intentionally not providing a full
        // NetworkConfiguration object.
        (givenNetworkClientId) => {
          if (givenNetworkClientId === networkClientId) {
            return {
              configuration: {
                chainId,
              },
            };
          }
          throw new Error(
            `Unrecognized network client ID '${givenNetworkClientId}'`,
          );
        },
      );
      const swapsControllerMessenger = rootMessenger.getRestricted({
        name: 'SwapsController',
        allowedActions: ['NetworkController:getNetworkClientById'],
        allowedEvents: ['NetworkController:networkDidChange'],
      });
      const controller = getSwapsController({
        options: {
          messenger: swapsControllerMessenger,
        },
        state: {
          chainCache: {},
        },
      });

      // @ts-expect-error Intentionally not providing full NetworkState object.
      rootMessenger.publish('NetworkController:networkDidChange', {
        selectedNetworkClientId: networkClientId,
      });

      expect(controller.state).toMatchObject({
        aggregatorMetadata: null,
        tokens: null,
        topAssets: null,
        aggregatorMetadataLastFetched: 0,
        tokensLastFetched: 0,
        chainCache: {
          [chainId]: {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
        },
      });
    });

    it('does not change state if the new chain ID is not among the list of supported chain IDs', async () => {
      const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
      const chainId = '0x99999999';
      const rootMessenger = new ControllerMessenger<
        NetworkControllerGetNetworkClientByIdAction,
        NetworkControllerNetworkDidChangeEvent
      >();
      rootMessenger.registerActionHandler(
        'NetworkController:getNetworkClientById',
        // @ts-expect-error Intentionally not providing a full
        // NetworkConfiguration object.
        (givenNetworkClientId) => {
          if (givenNetworkClientId === networkClientId) {
            return {
              configuration: {
                chainId,
              },
            };
          }
          throw new Error(
            `Unrecognized network client ID '${givenNetworkClientId}'`,
          );
        },
      );
      const swapsControllerMessenger = rootMessenger.getRestricted({
        name: 'SwapsController',
        allowedActions: ['NetworkController:getNetworkClientById'],
        allowedEvents: ['NetworkController:networkDidChange'],
      });
      const controller = getSwapsController({
        options: {
          messenger: swapsControllerMessenger,
          supportedChainIds: [],
        },
        state: {
          chainCache: {},
        },
      });
      const initialState = controller.state;

      // @ts-expect-error Intentionally not providing full NetworkState object.
      rootMessenger.publish('NetworkController:networkDidChange', {
        selectedNetworkClientId: networkClientId,
      });

      expect(controller.state).toBe(initialState);
    });
  });

  describe('fetchTokenWithCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('if the chain ID belonging to the given network is not supported', () => {
      it('does not attempt to fetch tokens', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchTokenWithCache({ networkClientId });

        expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
      });

      it('does not update state', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });
        const initialState = controller.state;

        await controller.fetchTokenWithCache({ networkClientId });

        expect(controller.state).toBe(initialState);
      });
    });

    describe('when no tokens have been fetched yet', () => {
      it('persists fetched tokens from simultaneous invocations to the chain cache but keeps the tokens from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(Date.now());
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokens: invocations[1].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            tokens: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokensLastFetched: 0,
          },
        });
      });
    });

    describe('when tokens in state is null', () => {
      it('persists fetched tokens from simultaneous invocations to the chain cache but keeps the tokens from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            tokens: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(Date.now());
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokens: invocations[1].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            tokens: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokensLastFetched: 0,
          },
        });
      });
    });

    describe('when tokens in state is empty and the last fetch time is the default', () => {
      it('persists fetched tokens from simultaneous invocations to the chain cache but keeps the tokens from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            tokens: [],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(Date.now());
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokens: invocations[1].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            tokens: [],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokensLastFetched: 0,
          },
        });
      });
    });

    describe('when there are tokens in state and they were last fetched beyond the configured threshold', () => {
      it('persists fetched tokens from simultaneous invocations to the chain cache but keeps the tokens from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const fetchTokensThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchTokensThreshold,
          },
          state: {
            tokens: [
              {
                address: '0x9999999',
                symbol: 'TOKEN9999',
                decimals: 9999,
              },
            ],
            tokensLastFetched: Date.now() - fetchTokensThreshold - 1,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(Date.now());
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokens: invocations[1].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const fetchTokensThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchTokensThreshold,
          },
          state: {
            tokens: [
              {
                address: '0x9999999',
                symbol: 'TOKEN9999',
                decimals: 9999,
              },
            ],
            tokensLastFetched: Date.now() - fetchTokensThreshold - 1,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTokens.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTokens call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTokenWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTokenWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.tokens).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.tokensLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            tokens: invocations[0].fetchedTokens,
            tokensLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            tokensLastFetched: 0,
          },
        });
      });
    });

    describe('when there are tokens in state but tokens were last fetched below the configured threshold', () => {
      it('does not fetch tokens', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x89'; // Polygon
        const controller = getSwapsController({
          state: {
            tokens: [
              {
                address: '0x999999999999',
                symbol: 'TEST',
                decimals: 1,
              },
            ],
            tokensLastFetched: Date.now(),
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchTokenWithCache({ networkClientId });

        expect(swapsUtilFetchTokens).not.toHaveBeenCalled();
      });
    });
  });

  describe('fetchTopAssetsWithCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('if the chain ID belonging to the given network is not supported', () => {
      it('does not attempt to fetch top assets', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchTopAssetsWithCache({ networkClientId });

        expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
      });

      it('does not update state', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });
        const initialState = controller.state;

        await controller.fetchTopAssetsWithCache({ networkClientId });

        expect(controller.state).toBe(initialState);
      });
    });

    describe('when no top assets have been fetched yet', () => {
      it('persists fetched top assets from simultaneous invocations to the chain cache but keeps the top assets from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssets: invocations[1].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            topAssets: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssetsLastFetched: 0,
          },
        });
      });
    });

    describe('when top assets in state is null', () => {
      it('persists fetched top assets from simultaneous invocations to the chain cache but keeps the top assets from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            topAssets: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssets: invocations[1].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            topAssets: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssetsLastFetched: 0,
          },
        });
      });
    });

    describe('when top assets in state is empty and the last fetch time is the default', () => {
      it('persists fetched top assets from simultaneous invocations to the chain cache but keeps the top assets from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            topAssets: [],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssets: invocations[1].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            topAssets: [],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssetsLastFetched: 0,
          },
        });
      });
    });

    describe('when there are top assets in state and they were last fetched beyond the configured threshold', () => {
      it('persists fetched top assets from simultaneous invocations to the chain cache but keeps the top assets from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const fetchTopAssetsThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchTopAssetsThreshold,
          },
          state: {
            topAssets: [
              {
                address: '0x9999999',
                symbol: 'TOKEN9999',
              },
            ],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssets: invocations[1].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const fetchTopAssetsThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchTopAssetsThreshold,
          },
          state: {
            topAssets: [
              {
                address: '0x9999999',
                symbol: 'TOKEN9999',
              },
            ],
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchTopAssets.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchTopAssets call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchTopAssetsWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.topAssets).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            topAssets: invocations[0].fetchedTokens,
            topAssetsLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            topAssetsLastFetched: 0,
          },
        });
      });
    });

    describe('when there are top assets in state but top assets were last fetched below the configured threshold', () => {
      it('does not fetch top assets', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x89'; // Polygon
        const controller = getSwapsController({
          state: {
            topAssets: [
              {
                address: '0x999999999999',
                symbol: 'TEST',
              },
            ],
            chainCache: {
              '0x89': {
                topAssetsLastFetched: Date.now(),
              } as ChainData,
            },
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchTopAssetsWithCache({ networkClientId });

        expect(swapsUtilFetchTopAssets).not.toHaveBeenCalled();
      });
    });
  });

  describe('fetchAggregatorMetadataWithCache', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('if the chain ID belonging to the given network is not supported', () => {
      it('does not attempt to fetch aggregator metadata', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchAggregatorMetadataWithCache({ networkClientId });

        expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
      });

      it('does not update state', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x99999999';
        const controller = getSwapsController();
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });
        const initialState = controller.state;

        await controller.fetchAggregatorMetadataWithCache({ networkClientId });

        expect(controller.state).toBe(initialState);
      });
    });

    describe('when no aggregator metadata has been fetched yet', () => {
      it('persists fetched aggregator metadata from simultaneous invocations to the chain cache but keeps the aggregator metadata from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(
          Date.now(),
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadata: invocations[1].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            aggregatorMetadata: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadataLastFetched: 0,
          },
        });
      });
    });

    describe('when aggregator metadata in state is null', () => {
      it('persists fetched aggregator metadata from simultaneous invocations to the chain cache but keeps the aggregator metadata from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            aggregatorMetadata: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(
          Date.now(),
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadata: invocations[1].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            aggregatorMetadata: null,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadataLastFetched: 0,
          },
        });
      });
    });

    describe('when aggregator metadata in state is empty and the last fetch time is the default', () => {
      it('persists fetched aggregator metadata from simultaneous invocations to the chain cache but keeps the aggregator metadata from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            aggregatorMetadata: {},
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(
          Date.now(),
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadata: invocations[1].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const controller = getSwapsController({
          options: {
            clientId,
          },
          state: {
            aggregatorMetadata: {},
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadataLastFetched: 0,
          },
        });
      });
    });

    describe('when there is aggregator metadata in state and it was last fetched beyond the configured threshold', () => {
      it('persists fetched aggregator metadata from simultaneous invocations to the chain cache but keeps the aggregator metadata from the most recent successful invocation only in the main part of state', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'CCCC-CCCC-CCCC-CCCC',
            chainId: AVALANCHE_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x2222222',
                symbol: 'TOKEN2',
                decimals: 3,
              },
              {
                address: '0x3333333',
                symbol: 'TOKEN3',
                decimals: 4,
              },
            ],
          },
        ];
        const fetchAggregatorMetadataThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchAggregatorMetadataThreshold,
          },
          state: {
            aggregatorMetadata: {
              test: {
                color: 'red',
                title: 'Title',
                icon: 'icon',
                iconPng: 'icon.png',
              },
            },
            aggregatorMetadataLastFetched:
              Date.now() - fetchAggregatorMetadataThreshold - 1,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              return invocations[1].fetchedTokens;
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[1].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(
          Date.now(),
        );
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadata: invocations[1].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
        });
      });

      it('clears the last fetch time in state if the fetch from the most recent invocation fails', async () => {
        const clientId = 'client-id';
        const invocations = [
          {
            networkClientId: 'AAAA-AAAA-AAAA-AAAA',
            chainId: POLYGON_CHAIN_ID,
            fetchedTokens: [
              {
                address: '0x1111111',
                symbol: 'TOKEN1',
                decimals: 1,
              },
              {
                address: '0x2222222',
                symbol: 'TOKEN1',
                decimals: 2,
              },
            ],
          },
          {
            networkClientId: 'BBBB-BBBB-BBBB-BBBB',
            chainId: BSC_CHAIN_ID,
          },
        ];
        const fetchAggregatorMetadataThreshold = 5000;
        const controller = getSwapsController({
          options: {
            clientId,
            fetchAggregatorMetadataThreshold,
          },
          state: {
            aggregatorMetadata: {
              test: {
                color: 'red',
                title: 'Title',
                icon: 'icon',
                iconPng: 'icon.png',
              },
            },
            aggregatorMetadataLastFetched:
              Date.now() - fetchAggregatorMetadataThreshold - 1,
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [invocations[0].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[0].chainId },
          },
          [invocations[1].networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId: invocations[1].chainId },
          },
        });
        swapsUtilFetchAggregatorMetadata.mockImplementation(
          async (givenChainId, givenClientId) => {
            if (
              givenChainId === invocations[0].chainId &&
              givenClientId === clientId
            ) {
              // Simulate the first fetchAggregatorMetadata call taking longer, to ensure
              // that the mutex is in place
              await new Promise((resolve) => originalSetTimeout(resolve, 0));
              return invocations[0].fetchedTokens;
            }
            if (
              givenChainId === invocations[1].chainId &&
              givenClientId === clientId
            ) {
              throw new Error('some error');
            }
            throw new Error(
              `Unknown chain ID '${givenChainId}' and/or client ID '${givenClientId}'`,
            );
          },
        );

        await Promise.all([
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[0].networkClientId,
          }),
          controller.fetchAggregatorMetadataWithCache({
            networkClientId: invocations[1].networkClientId,
          }),
        ]);

        expect(controller.state.aggregatorMetadata).toStrictEqual(
          invocations[0].fetchedTokens,
        );
        expect(controller.state.aggregatorMetadataLastFetched).toStrictEqual(0);
        expect(controller.state.chainCache).toStrictEqual({
          '0x1': {
            aggregatorMetadata: null,
            tokens: null,
            topAssets: null,
            aggregatorMetadataLastFetched: 0,
            topAssetsLastFetched: 0,
            tokensLastFetched: 0,
          },
          [invocations[0].chainId]: {
            aggregatorMetadata: invocations[0].fetchedTokens,
            aggregatorMetadataLastFetched: Date.now(),
          },
          [invocations[1].chainId]: {
            aggregatorMetadataLastFetched: 0,
          },
        });
      });
    });

    describe('when there is aggregator metadata in state but aggregator metadata was last fetched below the configured threshold', () => {
      it('does not fetch aggregator metadata', async () => {
        const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
        const chainId = '0x89'; // Polygon
        const controller = getSwapsController({
          state: {
            aggregatorMetadata: {
              test: {
                color: 'red',
                title: 'Title',
                icon: 'icon',
                iconPng: 'icon.png',
              },
            },
            aggregatorMetadataLastFetched: Date.now(),
          },
        });
        mockNetworkControllerGetNetworkClientById({
          [networkClientId]: {
            provider: new FakeProvider(),
            configuration: { chainId },
          },
        });

        await controller.fetchAggregatorMetadataWithCache({ networkClientId });

        expect(swapsUtilFetchAggregatorMetadata).not.toHaveBeenCalled();
      });
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
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('if fetch params are given', () => {
      for (const chainId of [
        ETH_CHAIN_ID,
        BSC_CHAIN_ID,
        POLYGON_CHAIN_ID,
        AVALANCHE_CHAIN_ID,
        ARBITRUM_CHAIN_ID,
        OPTIMISM_CHAIN_ID,
        ZKSYNC_ERA_CHAIN_ID,
        LINEA_CHAIN_ID,
        SWAPS_TESTNET_CHAIN_ID,
        BASE_CHAIN_ID,
      ]) {
        const chainName = CHAIN_ID_TO_NAME_MAP[chainId];
        describe(`given the ID of a network client for ${chainName}`, () => {
          describe('if fetch params metadata is given', () => {
            it('persists to state the given fetch params and fetch params metadata', () => {
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider(),
                  configuration: { chainId },
                },
              });
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });

              swapsController.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );

              expect(swapsController.state.fetchParams).toEqual(fetchParams);
              expect(swapsController.state.fetchParamsMetaData).toEqual(
                fetchParamsMetaData,
              );
            });

            it('immediately persists to state the fact that polling has started', () => {
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider(),
                  configuration: { chainId },
                },
              });
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });

              swapsController.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );

              expect(swapsController.state.isInPolling).toBe(true);
            });

            it('calls fetchTradesInfo with the given fetch params and the chain ID of the referenced network', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(swapsUtilFetchTradesInfo).toHaveBeenCalledWith(
                fetchParams,
                expect.any(AbortSignal),
                chainId,
                clientId,
              );
            });

            if (chainId === OPTIMISM_CHAIN_ID) {
              it('calls fetchEstimatedMultiLayerL1Fee with the EthQuery instance created for the referenced network', async () => {
                const clientId = 'client-id';
                const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
                const fetchParams = buildAPIFetchQuotesParams();
                const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                  networkClientId,
                });
                const provider = new FakeProvider({
                  stubs: [
                    buildNetVersionRequestStub(chainId),
                    buildErc20AllowanceCallStub(chainId, fetchParams),
                  ],
                });
                const quote = API_TRADES.paraswap;
                mockNetworkControllerGetNetworkClientById({
                  [networkClientId]: {
                    provider,
                    configuration: { chainId },
                  },
                });
                const ethQuery = new OriginalEthQuery(provider);
                jest
                  .spyOn(ethQueryModule, 'default')
                  .mockImplementation((givenProvider) => {
                    if (givenProvider === provider) {
                      return ethQuery;
                    }
                    throw new Error(
                      'Cannot instantiate EthQuery: Unknown provider',
                    );
                  });
                const fetchEstimatedMultiLayerL1FeeSpy = jest.fn();
                const fetchGasFeeEstimatesSpy = jest
                  .fn()
                  .mockResolvedValue(buildGasFeeEstimates());
                swapsUtilFetchTradesInfo.mockResolvedValue({
                  paraswap: quote,
                });
                const controller = getSwapsController({
                  options: {
                    clientId,
                    fetchEstimatedMultiLayerL1Fee:
                      fetchEstimatedMultiLayerL1FeeSpy,
                    fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                  },
                });

                controller.startFetchAndSetQuotes(
                  fetchParams,
                  fetchParamsMetaData,
                );
                // Ethers uses `setTimeout` to verify the network and to make
                // requests, so this will not only aid Ethers in initializing the
                // network but also cause the contract interaction request to
                // resolve.
                await jest.runOnlyPendingTimersAsync();

                expect(fetchEstimatedMultiLayerL1FeeSpy).toHaveBeenCalledWith(
                  ethQuery,
                  {
                    txParams: quote.trade,
                    networkClientId,
                  },
                );
              });

              it('calls estimateGas with the instance of EthQuery created for the given network and data from the approval transaction', async () => {
                const clientId = 'client-id';
                const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
                const fetchParams = buildAPIFetchQuotesParams({
                  sourceAmount: 1000,
                });
                const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                  networkClientId,
                });
                const provider = new FakeProvider({
                  stubs: [
                    buildNetVersionRequestStub(chainId),
                    buildErc20AllowanceCallStub(chainId, fetchParams, {
                      allowance: 500,
                    }),
                  ],
                });
                const quote = { ...API_TRADES.paraswap };
                mockNetworkControllerGetNetworkClientById({
                  [networkClientId]: {
                    provider,
                    configuration: { chainId },
                  },
                });
                const ethQuery = new OriginalEthQuery(provider);
                jest
                  .spyOn(ethQueryModule, 'default')
                  .mockImplementation((givenProvider) => {
                    if (givenProvider === provider) {
                      return ethQuery;
                    }
                    throw new Error(
                      'Cannot instantiate EthQuery: Unknown provider',
                    );
                  });
                const fetchGasFeeEstimatesSpy = jest
                  .fn()
                  .mockResolvedValue(buildGasFeeEstimates());
                swapsUtilFetchTradesInfo.mockResolvedValue({
                  paraswap: quote,
                });
                swapsUtilEstimateGas.mockResolvedValue({
                  gas: '0x1000',
                });
                const controller = getSwapsController({
                  options: {
                    clientId,
                    fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                  },
                });

                controller.startFetchAndSetQuotes(
                  fetchParams,
                  fetchParamsMetaData,
                );
                // Ethers uses `setTimeout` to verify the network and to make
                // requests, so this will not only aid Ethers in initializing the
                // network but also cause the contract interaction request to
                // resolve.
                await jest.runOnlyPendingTimersAsync();

                expect(swapsUtilEstimateGas).toHaveBeenCalledWith(
                  {
                    data: quote.approvalNeeded!.data,
                    from: quote.approvalNeeded!.from,
                    to: quote.approvalNeeded!.to,
                  },
                  ethQuery,
                );
              });
            }

            it('calls shouldEnableDirectWrapping with the chain ID of the referenced network', async () => {
              const shouldEnableDirectWrapping = jest.spyOn(
                swapsUtil,
                'shouldEnableDirectWrapping',
              );
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(shouldEnableDirectWrapping).toHaveBeenCalledWith(
                chainId,
                fetchParams.sourceToken,
                fetchParams.destinationToken,
              );
            });

            it('uses the Ethers provider created for the given network to look up the allowance', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethersProvider = new OriginalWeb3Provider(provider);
              jest
                .spyOn(ethersProviders, 'Web3Provider')
                .mockReturnValue(ethersProvider);
              const contract = new ethersContracts.Contract(
                fetchParams.sourceToken,
                abiERC20,
                ethersProvider,
              );
              const ContractSpy = jest
                .spyOn(ethersContracts, 'Contract')
                .mockReturnValue(contract);
              const fetchEstimatedMultiLayerL1FeeSpy = jest.fn();
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchEstimatedMultiLayerL1Fee:
                    fetchEstimatedMultiLayerL1FeeSpy,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(ContractSpy).toHaveBeenCalledWith(
                fetchParams.sourceToken,
                abiERC20,
                ethersProvider,
              );
            });

            it('only creates a single Ethers provider instance if called more than once a row with the same network client ID', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethersProvider = new OriginalWeb3Provider(provider);
              const Web3ProviderSpy = jest
                .spyOn(ethersProviders, 'Web3Provider')
                .mockReturnValue(ethersProvider);
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();
              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Wait for a fresh iteration
              await jest.runOnlyPendingTimersAsync();

              expect(Web3ProviderSpy).toHaveBeenCalledTimes(1);
            });

            it('calls estimateGas with the instance of EthQuery created for the given network and data from each quote', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              const quote = { ...API_TRADES.paraswap };
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethQuery = new OriginalEthQuery(provider);
              jest
                .spyOn(ethQueryModule, 'default')
                .mockImplementation((givenProvider) => {
                  if (givenProvider === provider) {
                    return ethQuery;
                  }
                  throw new Error(
                    'Cannot instantiate EthQuery: Unknown provider',
                  );
                });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              swapsUtilFetchTradesInfo.mockResolvedValue({
                paraswap: quote,
              });
              swapsUtilEstimateGas.mockResolvedValue({
                gas: '0x1000',
              });
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(swapsUtilEstimateGas).toHaveBeenCalledWith(
                {
                  data: quote.trade.data,
                  from: quote.trade.from,
                  to: quote.trade.to,
                  value: quote.trade.value,
                },
                ethQuery,
              );
            });

            it('passes the given network client ID to fetchGasFeeEstimates along with shouldUpdateState: true on first iteration and shouldUpdateState: false thereafter', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Making a contract interaction spawns more timers, so allow the
              // request to complete.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Making a contract interaction spawns more timers, so allow the
              // request to complete.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Try waiting for more timers to confirm no more are present.
              await jest.runOnlyPendingTimersAsync();

              expect(fetchGasFeeEstimatesSpy).toHaveBeenCalledTimes(3);
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(1, {
                networkClientId,
                shouldUpdateState: true,
              });
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(2, {
                networkClientId,
                shouldUpdateState: false,
              });
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(3, {
                networkClientId,
                shouldUpdateState: false,
              });
            });

            it('passes the chain ID of the given network client ID to fetchGasPrices when fetchGasFeeEstimates is unavailable', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasPricesSpy = jest
                .spyOn(swapsUtil, 'fetchGasPrices')
                .mockResolvedValue({
                  proposedGasPrice: '100',
                  safeGasPrice: '50',
                  fastGasPrice: '150',
                });
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: undefined,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(fetchGasPricesSpy).toHaveBeenCalledWith(chainId, clientId);
            });

            it('hits the referenced network when fetchGasFeeEstimates is unavailable and fetchGasPrices fails', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      {
                        request: {
                          method: 'eth_gasPrice',
                          params: [],
                        },
                        response: {
                          result: '0x11f71ed6fc0',
                        },
                      },
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              jest
                .spyOn(swapsUtil, 'fetchGasPrices')
                .mockRejectedValue(new Error('oops'));
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: undefined,
                },
              });

              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(controller.state).toMatchObject({
                usedGasEstimate: {
                  gasPrice: '1234.567',
                },
              });
            });
          });

          describe('if fetch params metadata is not given', () => {
            it('persists to state the given fetch params, and does not change the fetch params metadata', () => {
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider(),
                  configuration: { chainId },
                },
              });
              const fetchParams = buildAPIFetchQuotesParams();
              const initialFetchParamsMetaData = {
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
                networkClientId,
              };
              const controller = getSwapsController({
                state: {
                  fetchParamsMetaData: initialFetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);

              expect(controller.state.fetchParams).toEqual(fetchParams);
              expect(controller.state.fetchParamsMetaData).toBe(
                initialFetchParamsMetaData,
              );
            });

            it('immediately persists to state the fact that polling has started', () => {
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider(),
                  configuration: { chainId },
                },
              });
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const controller = getSwapsController({
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);

              expect(controller.state.isInPolling).toBe(true);
            });

            it('calls fetchTradesInfo with the given fetch params and the chain ID of the referenced network', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(swapsUtilFetchTradesInfo).toHaveBeenCalledWith(
                fetchParams,
                expect.any(AbortSignal),
                chainId,
                clientId,
              );
            });

            if (chainId === OPTIMISM_CHAIN_ID) {
              it('calls fetchEstimatedMultiLayerL1Fee with the EthQuery instance created for the referenced network', async () => {
                const clientId = 'client-id';
                const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
                const fetchParams = buildAPIFetchQuotesParams();
                const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                  networkClientId,
                });
                const provider = new FakeProvider({
                  stubs: [
                    buildNetVersionRequestStub(chainId),
                    buildErc20AllowanceCallStub(chainId, fetchParams),
                  ],
                });
                const quote = API_TRADES.paraswap;
                mockNetworkControllerGetNetworkClientById({
                  [networkClientId]: {
                    provider,
                    configuration: { chainId },
                  },
                });
                const ethQuery = new OriginalEthQuery(provider);
                jest
                  .spyOn(ethQueryModule, 'default')
                  .mockImplementation((givenProvider) => {
                    if (givenProvider === provider) {
                      return ethQuery;
                    }
                    throw new Error(
                      'Cannot instantiate EthQuery: Unknown provider',
                    );
                  });
                const fetchEstimatedMultiLayerL1FeeSpy = jest.fn();
                const fetchGasFeeEstimatesSpy = jest
                  .fn()
                  .mockResolvedValue(buildGasFeeEstimates());
                swapsUtilFetchTradesInfo.mockResolvedValue({
                  paraswap: quote,
                });
                const controller = getSwapsController({
                  options: {
                    clientId,
                    fetchEstimatedMultiLayerL1Fee:
                      fetchEstimatedMultiLayerL1FeeSpy,
                    fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                  },
                  state: {
                    fetchParamsMetaData,
                  },
                });

                controller.startFetchAndSetQuotes(fetchParams);
                // Ethers uses `setTimeout` to verify the network and to make
                // requests, so this will not only aid Ethers in initializing the
                // network but also cause the contract interaction request to
                // resolve.
                await jest.runOnlyPendingTimersAsync();

                expect(fetchEstimatedMultiLayerL1FeeSpy).toHaveBeenCalledWith(
                  ethQuery,
                  {
                    txParams: quote.trade,
                    networkClientId,
                  },
                );
              });
            }

            it('calls shouldEnableDirectWrapping with the chain ID of the referenced network', async () => {
              const shouldEnableDirectWrapping = jest.spyOn(
                swapsUtil,
                'shouldEnableDirectWrapping',
              );
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(shouldEnableDirectWrapping).toHaveBeenCalledWith(
                chainId,
                fetchParams.sourceToken,
                fetchParams.destinationToken,
              );
            });

            it('uses the Ethers provider created for the given network to look up the allowance', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethersProvider = new OriginalWeb3Provider(provider);
              jest
                .spyOn(ethersProviders, 'Web3Provider')
                .mockReturnValue(ethersProvider);
              const contract = new ethersContracts.Contract(
                fetchParams.sourceToken,
                abiERC20,
                ethersProvider,
              );
              const ContractSpy = jest
                .spyOn(ethersContracts, 'Contract')
                .mockReturnValue(contract);
              const fetchEstimatedMultiLayerL1FeeSpy = jest.fn();
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchEstimatedMultiLayerL1Fee:
                    fetchEstimatedMultiLayerL1FeeSpy,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(ContractSpy).toHaveBeenCalledWith(
                fetchParams.sourceToken,
                abiERC20,
                ethersProvider,
              );
            });

            it('only creates a single Ethers provider instance if called more than once a row with the same network client ID', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethersProvider = new OriginalWeb3Provider(provider);
              const Web3ProviderSpy = jest
                .spyOn(ethersProviders, 'Web3Provider')
                .mockReturnValue(ethersProvider);
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();
              controller.startFetchAndSetQuotes(
                fetchParams,
                fetchParamsMetaData,
              );
              // Wait for a fresh iteration
              await jest.runOnlyPendingTimersAsync();

              expect(Web3ProviderSpy).toHaveBeenCalledTimes(1);
            });

            it('calls estimateGas with the instance of EthQuery created for the given network and data from each quote', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              const provider = new FakeProvider({
                stubs: [
                  buildNetVersionRequestStub(chainId),
                  buildErc20AllowanceCallStub(chainId, fetchParams),
                ],
              });
              const quote = { ...API_TRADES.paraswap };
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider,
                  configuration: { chainId },
                },
              });
              const ethQuery = new OriginalEthQuery(provider);
              jest
                .spyOn(ethQueryModule, 'default')
                .mockImplementation((givenProvider) => {
                  if (givenProvider === provider) {
                    return ethQuery;
                  }
                  throw new Error(
                    'Cannot instantiate EthQuery: Unknown provider',
                  );
                });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              swapsUtilFetchTradesInfo.mockResolvedValue({
                paraswap: quote,
              });
              swapsUtilEstimateGas.mockResolvedValue({
                gas: '0x1000',
              });
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(swapsUtilEstimateGas).toHaveBeenCalledWith(
                {
                  data: quote.trade.data,
                  from: quote.trade.from,
                  to: quote.trade.to,
                  value: quote.trade.value,
                },
                ethQuery,
              );
            });

            it('passes the given network client ID to fetchGasFeeEstimates along with shouldUpdateState: true on first iteration and shouldUpdateState: false thereafter', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasFeeEstimatesSpy = jest
                .fn()
                .mockResolvedValue(buildGasFeeEstimates());
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: fetchGasFeeEstimatesSpy,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Making a contract interaction spawns more timers, so allow the
              // request to complete.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Making a contract interaction spawns more timers, so allow the
              // request to complete.
              await jest.runOnlyPendingTimersAsync();
              // Wait for the next polling iteration.
              await jest.runOnlyPendingTimersAsync();
              // Try waiting for more timers to confirm no more are present.
              await jest.runOnlyPendingTimersAsync();

              expect(fetchGasFeeEstimatesSpy).toHaveBeenCalledTimes(3);
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(1, {
                networkClientId,
                shouldUpdateState: true,
              });
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(2, {
                networkClientId,
                shouldUpdateState: false,
              });
              expect(fetchGasFeeEstimatesSpy).toHaveBeenNthCalledWith(3, {
                networkClientId,
                shouldUpdateState: false,
              });
            });

            it('passes the chain ID of the given network client ID to fetchGasPrices when fetchGasFeeEstimates is unavailable', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              const fetchGasPricesSpy = jest
                .spyOn(swapsUtil, 'fetchGasPrices')
                .mockResolvedValue({
                  proposedGasPrice: '100',
                  safeGasPrice: '50',
                  fastGasPrice: '150',
                });
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: undefined,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(fetchGasPricesSpy).toHaveBeenCalledWith(chainId, clientId);
            });

            it('hits the referenced network when fetchGasFeeEstimates is unavailable and fetchGasPrices fails', async () => {
              const clientId = 'client-id';
              const networkClientId = 'AAAA-BBBB-CCCC-DDDD';
              const fetchParams = buildAPIFetchQuotesParams();
              const fetchParamsMetaData = buildAPIFetchQuotesMetadata({
                networkClientId,
              });
              mockNetworkControllerGetNetworkClientById({
                [networkClientId]: {
                  provider: new FakeProvider({
                    stubs: [
                      buildNetVersionRequestStub(chainId),
                      buildErc20AllowanceCallStub(chainId, fetchParams),
                      {
                        request: {
                          method: 'eth_gasPrice',
                          params: [],
                        },
                        response: {
                          result: '0x11f71ed6fc0',
                        },
                      },
                    ],
                  }),
                  configuration: { chainId },
                },
              });
              jest
                .spyOn(swapsUtil, 'fetchGasPrices')
                .mockRejectedValue(new Error('oops'));
              const controller = getSwapsController({
                options: {
                  clientId,
                  fetchGasFeeEstimates: undefined,
                },
                state: {
                  fetchParamsMetaData,
                },
              });

              controller.startFetchAndSetQuotes(fetchParams);
              // Ethers uses `setTimeout` to verify the network and to make
              // requests, so this will not only aid Ethers in initializing the
              // network but also cause the contract interaction request to
              // resolve.
              await jest.runOnlyPendingTimersAsync();

              expect(controller.state).toMatchObject({
                usedGasEstimate: {
                  gasPrice: '1234.567',
                },
              });
            });
          });
        });
      }
    });

    describe('if no fetch parameters are provided', () => {
      it('returns null', () => {
        expect(swapsController.startFetchAndSetQuotes()).toBeNull();
      });

      it('does not store in state the fact that polling has started', () => {
        swapsController.startFetchAndSetQuotes();

        expect(swapsController.state.isInPolling).toBe(false);
      });
    });
  });

  describe('stopPollingAndResetState', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

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
      const gasPriceEstimate = await swapsController.getGasPrice({
        chainId: '0x1',
      });
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

      await expect(
        // @ts-expect-error - testing private method
        swapsController.getGasPrice({ chainId: '0x1' }),
      ).rejects.toThrow(swapsUtil.SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
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
      const gasPrice = await swapsController.getGasPrice({
        chainId: '0x1',
      });
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
