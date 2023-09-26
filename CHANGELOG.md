# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/MetaMask/swaps-controller/compare/v6.9.2...HEAD
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
