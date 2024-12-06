import SwapsController from './SwapsController';

export default SwapsController;

export { CHAIN_ID_TO_NAME_MAP } from './constants';

export * as swapsUtils from './swapsUtil';

export type {
  SwapsControllerState,
  SwapsControllerGetStateAction,
  SwapsControllerStateChangeEvent,
  SwapsControllerActions,
  SwapsControllerEvents,
  SwapsControllerMessenger,
  SwapsControllerOptions,
  SwapsControllerUpdateQuotesWithGasPrice,
  SwapsControllerUpdateSelectedQuoteWithGasLimit,
  SwapsControllerStartFetchAndSetQuotes,
  SwapsControllerFetchTokenWithCache,
  SwapsControllerFetchTopAssetsWithCache,
  SwapsControllerFetchAggregatorMetadataWithCache,
  SwapsControllerStopPollingAndResetState,
  FeatureFlags,
} from './types';
