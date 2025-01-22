# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [12.1.0]

### Changed
- Add the "enableGasIncludedQuotes" param for fetching quotes ([#390](https://github.com/MetaMask/swaps-controller/pull/390))
- Add back `rimraf` for the `build:clean` script ([#376](https://github.com/MetaMask/swaps-controller/pull/376))
- Export CHAIN_ID_TO_NAME_MAP ([#383](https://github.com/MetaMask/swaps-controller/pull/383))
- Export `FeatureFlags` type ([#380](https://github.com/MetaMask/swaps-controller/pull/380))

## [12.0.0]

### Changed

- **BREAKING:** Consumers must now allow `NetworkController:getNetworkClientById` as a messenger action ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Consumers must no longer allow `NetworkController:findNetworkClientIdByChainId` as a messenger action ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Consumers must now allow `NetworkController:networkDidChange` as a messenger event ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update `startFetchAndSetQuotes` so that a `networkClientId` must be specified within the fetch metadata ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update `fetchTokenWithCache`, `fetchTopAssetsWithCache`, and `fetchAggregatorMetadataWithCache` so that a `networkClientId` must be specified as an option ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update signature of `fetchGasFeeEstimates` option so that the function expects a `networkClientId` option ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update signature of `fetchEstimatedMultiLayerL1Fee` option so that the function expects a `networkClientId` rather than `chainId` ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update type of `fetchParamsMetaData` in `SwapsControllerState` to add required property `networkClientId` ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update type of `fetchGasFeeEstimates` in `SwapsControllerOptions` to match signature of same method in `GasFeeController` ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- **BREAKING:** Update type of `fetchEstimatedMultiLayerL1Fee` in `SwapsControllerOptions` by replacing `chainId` in `options` with `networkClientId` ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
- The chain cache in state will now automatically be updated whenever the network has changed ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
  - This aims to replace behavior provided by `setProvider` and `setChainId`.
- **BREAKING:** Bump peer dependency `@metamask/gas-fee-controller` to `^22.0.0` ([#369](https://github.com/MetaMask/swaps-controller/pull/369), [#379](https://github.com/MetaMask/swaps-controller/pull/379))
- **BREAKING:** Bump peer dependency `@metamask/network-controller` to `^22.0.0` ([#369](https://github.com/MetaMask/swaps-controller/pull/369), [#379](https://github.com/MetaMask/swaps-controller/pull/379))

### Removed

- **BREAKING:** Remove `chainId` from constructor options ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
  - The global chain ID no longer needs to be tracked. Methods that rely on a network now take a `networkClientId` option.
- **BREAKING:** Remove `setChainId` method ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
  - Instead of calling this method when the network changes to capture the current chain ID, pass `networkClientId` to the appropriate method.
- **BREAKING:** Remove `setProvider` method ([#347](https://github.com/MetaMask/swaps-controller/pull/347))
  - Instead of calling this method when the network changes to capture the current provider, pass `networkClientId` to the appropriate method.
  - Note that `setProvider` was also allowing the `pollCountLimit` to be reset. However, upon reviewing clients, it was discovered that the `pollCountLimit` never changes. Instead of using method to set this option, pass it to the constructor when initializing the controller.
- **BREAKING:** Remove `chainId` from `SwapsControllerOptions` type ([#347](https://github.com/MetaMask/swaps-controller/pull/347))

## [11.0.0]

### Changed

- **BREAKING**: Bump `@metamask/network-controller` peer dependency from `^18.1.0` to `^21.1.0` ([#332](https://github.com/MetaMask/swaps-controller/pull/332))
- **BREAKING**: `@metamask/gas-fee-controller` is now listed as peer dependency ([#331](https://github.com/MetaMask/swaps-controller/pull/331))
  - The package version has been bumped from `^15.1.2` to `^21.0.0`
- Bump `@metamask/transaction-controller` from `^19.0.1` to `^37.3.0` ([#333](https://github.com/MetaMask/swaps-controller/pull/333))
- Bump `@metamask/approval-controller` from `^5.1.1` to `^7.1.0` ([#333](https://github.com/MetaMask/swaps-controller/pull/333))
- Bump `@metamask/utils` from `^8.5.0` to `^10.0.0` ([#330](https://github.com/MetaMask/swaps-controller/pull/330))
- Bump `@metamask/controller-utils` from `^10.0.0` to `^11.3.0` ([#322](https://github.com/MetaMask/swaps-controller/pull/322))
- Bump `@metamask/base-controller` from `^5.0.2` to `^7.0.1` ([#319](https://github.com/MetaMask/swaps-controller/pull/319))
- Bump `@metamask/safe-event-emitter` from `^3.1.1` to `^3.1.2` ([#329](https://github.com/MetaMask/swaps-controller/pull/329))
- Bump `secp256k1` in the npm_and_yarn group ([#327](https://github.com/MetaMask/swaps-controller/pull/327))
- Bump `@metamask/rpc-errors` from `^6.3.1` to `^6.4.0` ([#325](https://github.com/MetaMask/swaps-controller/pull/325))
- Update `LICENSE` ([#338](https://github.com/MetaMask/swaps-controller/pull/338))

## [10.0.0]

### Changed

- **BREAKING**: Upgrade controller to BaseController V2 ([#277](https://github.com/MetaMask/swaps-controller/pull/277))

### Fixed

- Fix incorrect version after revert ([#318](https://github.com/MetaMask/swaps-controller/pull/318))
- Update name of Polygon network token from MATIC to POL ([#312](https://github.com/MetaMask/swaps-controller/pull/312))

## [9.0.12]

### Changed

- Remove Web3 and use Ethers to read allowance from contracts, speeding up performance on Android ([#309](https://github.com/MetaMask/swaps-controller/pull/309))

## [9.0.9]

### Changed

- Re-release due to publishing failure

## [9.0.8]

### Fixed

- Updates the publish step ([#291](https://github.com/MetaMask/swaps-controller/pull/291))

## [9.0.7]

### Fixed

- Remove setup node steps on publish ([#289](https://github.com/MetaMask/swaps-controller/pull/289))

## [9.0.6]

### Fixed

- Fix for publish-npm-dry-run workflow ([#287](https://github.com/MetaMask/swaps-controller/pull/287))

## [9.0.5]

### Fixed

- Fix for broken node-version on github workflow ([#285](https://github.com/MetaMask/swaps-controller/pull/285))

## [9.0.4]

### Fixed

- Fix for publish-release workflow ([#282](https://github.com/MetaMask/swaps-controller/pull/282))

## [9.0.3]

### Fixed

- Upgrade to Yarn v4 and fix publishing ([#278](https://github.com/MetaMask/swaps-controller/pull/278))

## [9.0.2]

### Changed

- Increase test coverage ([#274](https://github.com/MetaMask/swaps-controller/pull/274))
- Bump `braces` from `3.0.2` to `3.0.3` ([#257](https://github.com/MetaMask/swaps-controller/pull/257))

### Fixed

- Fix issue in Mobile Swaps where users would be blocked from pressing the swap button after the first poll finishes ([#275](https://github.com/MetaMask/swaps-controller/pull/275))

## [9.0.1]

### Changed

- Update old codefi.network urls ([#260](https://github.com/MetaMask/swaps-controller/pull/260))

### Fixed

- Fix Web3 import behaving differently between unit test and React Native envs ([#255](https://github.com/MetaMask/swaps-controller/pull/255))
- Fix `bigint` cast to `Number` results in `null` on Android only ([#259](https://github.com/MetaMask/swaps-controller/pull/259))

## [9.0.0]

### Changed

- **BREAKING**: peerDependency `@metamask/composable-controller` requires upgrade from v1 to v4 ([#219](https://github.com/MetaMask/swaps-controller/pull/219))
- **BREAKING**: Update `@metamask/gas-fee-controller` from v3 to v12 ([#219](https://github.com/MetaMask/swaps-controller/pull/219))
- Update `@metamask/base-controller` from v1 to v4 ([#219](https://github.com/MetaMask/swaps-controller/pull/219))

### Fixed

- Remove dependency on deprecated `web3-provider-engine` ([#219](https://github.com/MetaMask/swaps-controller/pull/219))
- Upgrade legacy `eth-sig-util` to `@metamask/eth-sig-util` ([#219](https://github.com/MetaMask/swaps-controller/pull/219))
- Replace legacy `ethjs` with `@metamask/ethjs` ([#219](https://github.com/MetaMask/swaps-controller/pull/219))
- Replace legacy `ethjs-query` with `@metamask/ethjs-query` ([#219](https://github.com/MetaMask/swaps-controller/pull/219))

## [8.1.0]

### Added

- Add `fetchSwapsFeatureFlags` to fetch global and chain feature flags at once ([#229](https://github.com/MetaMask/swaps-controller/pull/229))

### Fixed

- Fix bug in contract instance creation for `getERC20Allowance` ([#241](https://github.com/MetaMask/swaps-controller/pull/241))

## [8.0.0]

### Changed

- **BREAKING**: Replace `@metamask/controllers` with individual controller packages ([#193](https://github.com/MetaMask/swaps-controller/pull/193)) ([#214](https://github.com/MetaMask/swaps-controller/pull/214)) ([#215](https://github.com/MetaMask/swaps-controller/pull/215))
- Bump `async-mutex` from `^0.3.1` to `^0.4.1` ([#194](https://github.com/MetaMask/swaps-controller/pull/194))
- Bump `@metamask/auto-changelog` from `^2.5.0` to `^3.4.4` ([#194](https://github.com/MetaMask/swaps-controller/pull/194))
- Replace `@metamask/ethjs-query` with `@metamask/eth-query` ([#191](https://github.com/MetaMask/swaps-controller/pull/191))
- Move dependencies from/to devDependencies ([#215](https://github.com/MetaMask/swaps-controller/pull/215)) ([#217](https://github.com/MetaMask/swaps-controller/pull/217))
- Fix web3 import ([#212](https://github.com/MetaMask/swaps-controller/pull/212))
- Exclude tests from `dist` and change target on `tsconfig.json` ([#212](https://github.com/MetaMask/swaps-controller/pull/212))

### Removed

- Remove dependency `ethereumjs-util` ([#192](https://github.com/MetaMask/swaps-controller/pull/192))

## [7.0.1]

### Added

- Add Base constants ([#206](https://github.com/MetaMask/swaps-controller/pull/206))

## [7.0.0]

### Changed

- **BREAKING:** Bump `@metamask/controllers` from 26.0.0 to 33.0.0 ([#139](https://github.com/MetaMask/swaps-controller/pull/139))
  - This is breaking because it changes the type of the state property `usedGasEstimate`. Specifically, it is now possible for the `historicalBaseFeeRange`, `baseFeeTrend`, `latestPriorityFeeRange`, `historicalPriorityFeeRange`, `priorityFeeTrend`, and `networkCongestion` properties in this object to be `null`.
- **BREAKING:** Change `chainId` and `supportedChainIds` config options so that they must be `0x`-prefixed hex strings ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
- **BREAKING:** Change `fetchEstimatedMultiLayerL1Fee` constructor option so that the `chainId` option must be an `0x`-prefixed hex string ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
- **BREAKING:** Change `getNewChainCache` method so that `chainId` must be an `0x`-prefixed hex string ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
- **BREAKING:** Change `chainId` setter so that the value must be an `0x`-prefixed hex string ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
- **BREAKING:** Change `chainCache` state property so that it is keyed by a `0x`-prefixed chain ID ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
- **BREAKING:** Change various utility functions so that their `chainId` argument must be an `0x`-prefixed hex string ([#184](https://github.com/MetaMask/swaps-controller/pull/184))
  - `getNativeSwapsToken`
  - `getSwapsContractAddress`
  - `isValidContractAddress`
  - `shouldEnableDirectWrapping`
  - `getBaseApiURL`
  - `getTokenMetadataURL`
  - `fetchTradesInfo`
  - `fetchTokens`
  - `fetchAggregatorMetadata`
  - `fetchTopAssets`
  - `fetchSwapsFeatureLiveness`
  - `fetchGasPrices`
- **BREAKING:** Bump minimum Node version to 18 ([#186](https://github.com/MetaMask/swaps-controller/pull/186))
- Update Gas API base URL from `https://gas.metaswap.codefi.network` to `https://gas.api.cx.metamask.io` ([#185](https://github.com/MetaMask/swaps-controller/pull/185))

## [6.9.3]

### Added

- Add Linea constants ([#170](https://github.com/MetaMask/swaps-controller/pull/170))

### Changed

- Bump word-wrap from 1.2.3 to 1.2.5 ([#166](https://github.com/MetaMask/swaps-controller/pull/166))

## [6.9.2]

### Changed

- Update dev base url ([#167](https://github.com/MetaMask/swaps-controller/pull/167))
- Update CODEOWNERS ([#156](https://github.com/MetaMask/swaps-controller/pull/156))

## [6.9.1]

### Added

- Enable zkSync ([#160](https://github.com/MetaMask/swaps-controller/pull/160))

### Changed

- Rename ZKSYNC to ZKSYNC_ERA ([#162](https://github.com/MetaMask/swaps-controller/pull/162))
- Bump cookiejar from 2.1.2 to 2.1.4 ([#154](https://github.com/MetaMask/swaps-controller/pull/154))
- Bump json5 from 1.0.1 to 1.0.2 ([#152](https://github.com/MetaMask/swaps-controller/pull/152))

## [6.8.0]

### Added

- Fetch an L1 fee for each quote on Optimism ([#150](https://github.com/MetaMask/swaps-controller/pull/150))

### Changed

- Bump decode-uri-component from 0.2.0 to 0.2.2 ([#148](https://github.com/MetaMask/swaps-controller/pull/148))
- Bump qs from 6.5.2 to 6.5.3 ([#149](https://github.com/MetaMask/swaps-controller/pull/149))

## [6.7.2]

### Fixed

- Handle empty values for sourceToken and destinationToken ([#146](https://github.com/MetaMask/swaps-controller/pull/146))

## [6.7.1]

### Fixed

- Change contract addresses for Arbitrum and Optimism to lowercase ([#144](https://github.com/MetaMask/swaps-controller/pull/144))

## [6.7.0]

### Added

- Add support for new networks - Optimism and Arbitrum ([#141](https://github.com/MetaMask/swaps-controller/pull/141))

### Changed

- Bump minimist from 1.2.5 to 1.2.6 ([#118](https://github.com/MetaMask/swaps-controller/pull/118))

## [6.6.0]

### Added

- Update default supported chains and add check for supported chainId on fetch methods ([#113](https://github.com/MetaMask/swaps-controller/pull/113))

### Changed

- Bump @metamask/controllers from 25.1.0 to 26.0.0 ([#114](https://github.com/MetaMask/swaps-controller/pull/114))

## [6.5.0]

### Added

- Add Avalanche constants ([#111](https://github.com/MetaMask/swaps-controller/pull/111))

### Changed

- Bump @metamask/controllers from 22.0.0 to 25.1.0 ([#109](https://github.com/MetaMask/swaps-controller/pull/109))

## [6.4.0]

### Changed

- Use named api urls for swap and gas ([#99](https://github.com/MetaMask/swaps-controller/pull/99))

### Fixed

- Fix feature liveness types ([#95](https://github.com/MetaMask/swaps-controller/pull/95))

## [6.3.0]

### Added

- License file ([#83](https://github.com/MetaMask/swaps-controller/pull/83))

### Changed

- Set `clientId` on HTTP request headers ([#84](https://github.com/MetaMask/swaps-controller/pull/84))

## [6.2.0]

### Added

- Add Token metadata API endpoint and function ([#80](https://github.com/MetaMask/swaps-controller/pull/80))

## [6.1.1]

### Fixed

- Fix unwrapping by bypassing allowance check ([#76](https://github.com/MetaMask/swaps-controller/pull/76))
- Fix polygon contract address constant ([#76](https://github.com/MetaMask/swaps-controller/pull/76))

## [6.1.0]

### Changed

- Moved wrapped contracts to constants ([#70](https://github.com/MetaMask/swaps-controller/pull/70))
- Use standalone gas API endpoint ([#70](https://github.com/MetaMask/swaps-controller/pull/70))
- Bump @metamask/controllers from 14.1.0 to 14.2.0 ([#69](https://github.com/MetaMask/swaps-controller/pull/69))

[Unreleased]: https://github.com/MetaMask/swaps-controller/compare/v12.1.0...HEAD
[12.1.0]: https://github.com/MetaMask/swaps-controller/compare/v12.0.0...v12.1.0
[12.0.0]: https://github.com/MetaMask/swaps-controller/compare/v11.0.0...v12.0.0
[11.0.0]: https://github.com/MetaMask/swaps-controller/compare/v10.0.0...v11.0.0
[10.0.0]: https://github.com/MetaMask/swaps-controller/compare/v9.0.12...v10.0.0
[9.0.12]: https://github.com/MetaMask/swaps-controller/compare/v9.0.9...v9.0.12
[9.0.9]: https://github.com/MetaMask/swaps-controller/compare/v9.0.8...v9.0.9
[9.0.8]: https://github.com/MetaMask/swaps-controller/compare/v9.0.7...v9.0.8
[9.0.7]: https://github.com/MetaMask/swaps-controller/compare/v9.0.6...v9.0.7
[9.0.6]: https://github.com/MetaMask/swaps-controller/compare/v9.0.5...v9.0.6
[9.0.5]: https://github.com/MetaMask/swaps-controller/compare/v9.0.4...v9.0.5
[9.0.4]: https://github.com/MetaMask/swaps-controller/compare/v9.0.3...v9.0.4
[9.0.3]: https://github.com/MetaMask/swaps-controller/compare/v9.0.2...v9.0.3
[9.0.2]: https://github.com/MetaMask/swaps-controller/compare/v9.0.1...v9.0.2
[9.0.1]: https://github.com/MetaMask/swaps-controller/compare/v9.0.0...v9.0.1
[9.0.0]: https://github.com/MetaMask/swaps-controller/compare/v8.1.0...v9.0.0
[8.1.0]: https://github.com/MetaMask/swaps-controller/compare/v8.0.0...v8.1.0
[8.0.0]: https://github.com/MetaMask/swaps-controller/compare/v7.0.1...v8.0.0
[7.0.1]: https://github.com/MetaMask/swaps-controller/compare/v7.0.0...v7.0.1
[7.0.0]: https://github.com/MetaMask/swaps-controller/compare/v6.9.3...v7.0.0
[6.9.3]: https://github.com/MetaMask/swaps-controller/compare/v6.9.2...v6.9.3
[6.9.2]: https://github.com/MetaMask/swaps-controller/compare/v6.9.1...v6.9.2
[6.9.1]: https://github.com/MetaMask/swaps-controller/compare/v6.8.0...v6.9.1
[6.8.0]: https://github.com/MetaMask/swaps-controller/compare/v6.7.2...v6.8.0
[6.7.2]: https://github.com/MetaMask/swaps-controller/compare/v6.7.1...v6.7.2
[6.7.1]: https://github.com/MetaMask/swaps-controller/compare/v6.7.0...v6.7.1
[6.7.0]: https://github.com/MetaMask/swaps-controller/compare/v6.6.0...v6.7.0
[6.6.0]: https://github.com/MetaMask/swaps-controller/compare/v6.5.0...v6.6.0
[6.5.0]: https://github.com/MetaMask/swaps-controller/compare/v6.4.0...v6.5.0
[6.4.0]: https://github.com/MetaMask/swaps-controller/compare/v6.3.0...v6.4.0
[6.3.0]: https://github.com/MetaMask/swaps-controller/compare/v6.2.0...v6.3.0
[6.2.0]: https://github.com/MetaMask/swaps-controller/compare/v6.1.1...v6.2.0
[6.1.1]: https://github.com/MetaMask/swaps-controller/compare/v6.1.0...v6.1.1
[6.1.0]: https://github.com/MetaMask/swaps-controller/releases/tag/v6.1.0
