"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.INITIAL_CHAIN_DATA = void 0;
const controllers_1 = require("@metamask/controllers");
const abort_controller_1 = require("abort-controller");
const bignumber_js_1 = require("bignumber.js");
const eth_query_1 = __importDefault(require("eth-query"));
const human_standard_token_abi_1 = __importDefault(require("human-standard-token-abi"));
const async_mutex_1 = require("async-mutex");
const web3_1 = __importDefault(require("web3"));
const swapsUtil_1 = require("./swapsUtil");
// Functions to determine type of the return value from GasFeeController
function isGasFeeStateEthGasPrice(object) {
    return object.gasEstimateType === controllers_1.GAS_ESTIMATE_TYPES.ETH_GASPRICE;
}
function isGasFeeStateFeeMarket(object) {
    return object.gasEstimateType === controllers_1.GAS_ESTIMATE_TYPES.FEE_MARKET;
}
function isGasFeeStateLegacy(object) {
    return object.gasEstimateType === controllers_1.GAS_ESTIMATE_TYPES.LEGACY;
}
function isEthGasPriceEstimate(object) {
    return Boolean(object) && (object === null || object === void 0 ? void 0 : object.gasPrice) !== undefined;
}
function isCustomEthGasPriceEstimate(object) {
    return Boolean(object) && (object === null || object === void 0 ? void 0 : object.gasPrice) !== undefined;
}
function isCustomGasFee(object) {
    return (Boolean(object) &&
        'maxFeePerGas' in object &&
        'maxPriorityFeePerGas' in object);
}
function gweiDecToWEIBN(n) {
    return controllers_1.util.gweiDecToWEIBN(n);
}
exports.INITIAL_CHAIN_DATA = {
    aggregatorMetadata: null,
    tokens: null,
    topAssets: null,
    aggregatorMetadataLastFetched: 0,
    topAssetsLastFetched: 0,
    tokensLastFetched: 0,
};
/**
 * Gets a new chainCache for a chainId with updated data
 * @param chainCache Current chainCache from state
 * @param chainId Current chainId from the config
 * @param data Data to be updated
 * @returns chainCache with updated data
 */
function getNewChainCache(chainCache, chainId, data) {
    return Object.assign(Object.assign({}, chainCache), { [chainId]: Object.assign(Object.assign({}, chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]), data) });
}
class SwapsController extends controllers_1.BaseController {
    /**
     * Creates a SwapsController instance
     *
     * @param options
     * @param options.fetchGasFeeEstimates - Fetches gas fee estimates from GasFeeController
     * @param config - Initial options used to configure this controller
     * @param state - Initial state to set on this controller
     */
    constructor({ fetchGasFeeEstimates, }, config, state) {
        super(config, state);
        this.pollCount = 0;
        this.mutex = new async_mutex_1.Mutex();
        /**
         * Name of this controller used during composition
         */
        this.name = 'SwapsController';
        /**
         * List of required sibling controllers this controller needs to function
         */
        this.requiredControllers = [];
        this.defaultConfig = {
            maxGasLimit: 2500000,
            pollCountLimit: 3,
            fetchAggregatorMetadataThreshold: 1000 * 60 * 60 * 24 * 15,
            fetchTokensThreshold: 1000 * 60 * 60 * 24,
            fetchTopAssetsThreshold: 1000 * 60 * 30,
            provider: undefined,
            chainId: '1',
            supportedChainIds: [
                swapsUtil_1.ETH_CHAIN_ID,
                swapsUtil_1.BSC_CHAIN_ID,
                swapsUtil_1.SWAPS_TESTNET_CHAIN_ID,
                swapsUtil_1.POLYGON_CHAIN_ID,
                swapsUtil_1.AVALANCHE_CHAIN_ID,
            ],
            clientId: undefined,
        };
        this.defaultState = {
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
            error: { key: null, description: null },
            topAggId: null,
            tokensLastFetched: 0,
            isInPolling: false,
            pollingCyclesLeft: (config === null || config === void 0 ? void 0 : config.pollCountLimit) || 3,
            quoteRefreshSeconds: null,
            usedGasEstimate: null,
            usedCustomGas: null,
            chainCache: {
                '1': exports.INITIAL_CHAIN_DATA,
            },
        };
        this.fetchGasFeeEstimates = fetchGasFeeEstimates;
        this.initialize();
    }
    /**
     * Fetch current gas price
     *
     * @returns - Promise resolving to the current gas price or throw an error
     */
    /* istanbul ignore next */
    async getGasPrice() {
        if (this.fetchGasFeeEstimates) {
            const gasFeeState = await this.fetchGasFeeEstimates({
                shouldUpdateState: this.pollCount === 1,
            });
            if (!gasFeeState ||
                gasFeeState.gasEstimateType === controllers_1.GAS_ESTIMATE_TYPES.NONE) {
                throw new Error(swapsUtil_1.SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
            }
            if (isGasFeeStateFeeMarket(gasFeeState)) {
                return gasFeeState.gasFeeEstimates;
            }
            else if (isGasFeeStateLegacy(gasFeeState)) {
                return { gasPrice: gasFeeState.gasFeeEstimates.medium };
            }
            else if (isGasFeeStateEthGasPrice(gasFeeState)) {
                return { gasPrice: gasFeeState.gasFeeEstimates.gasPrice };
            }
        }
        try {
            const { proposedGasPrice } = await swapsUtil_1.fetchGasPrices(this.config.chainId, this.config.clientId);
            return { gasPrice: proposedGasPrice };
        }
        catch (e) {
            //
        }
        try {
            const gasPrice = await controllers_1.util.query(this.ethQuery, 'gasPrice');
            return {
                gasPrice: controllers_1.util.weiHexToGweiDec(gasPrice).toString(),
            };
        }
        catch (e) {
            //
        }
        throw new Error(swapsUtil_1.SwapsError.SWAPS_GAS_PRICE_ESTIMATION);
    }
    /**
     * Calculates a quote `QuotesValue`
     * @param quote Quote object
     * @param gasLimit A hex string representing max units of gas to spend
     * @param gasFeeEstimates current gas fee estimates
     * @param customGasFee custom gas fee values
     */
    /* istanbul ignore next */
    calculateQuoteValues(quote, gasLimit, gasFeeEstimates, customGasFee) {
        const { destinationTokenInfo } = this.state.fetchParamsMetaData;
        const { aggregator, averageGas, maxGas, destinationAmount = 0, fee: metaMaskFee, sourceAmount, sourceToken, trade, gasEstimateWithRefund, gasEstimate, gasMultiplier, approvalNeeded, destinationTokenRate, } = quote;
        // trade gas
        const { tradeGasLimit, tradeMaxGasLimit } = swapsUtil_1.calculateGasLimits(Boolean(approvalNeeded), gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit);
        let totalGasInWei;
        let maxTotalGasInWei;
        if (isEthGasPriceEstimate(gasFeeEstimates)) {
            const gasPrice = isCustomEthGasPriceEstimate(customGasFee)
                ? customGasFee.gasPrice
                : gasFeeEstimates.gasPrice;
            totalGasInWei = tradeGasLimit.times(gweiDecToWEIBN(gasPrice).toString(16), 16);
            maxTotalGasInWei = tradeMaxGasLimit.times(gweiDecToWEIBN(gasPrice).toString(16), 16);
        }
        else {
            const estimatedBaseFee = (isCustomGasFee(customGasFee) && (customGasFee === null || customGasFee === void 0 ? void 0 : customGasFee.estimatedBaseFee)) ||
                gasFeeEstimates.estimatedBaseFee;
            const [maxFeePerGas, maxPriorityFeePerGas] = isCustomGasFee(customGasFee)
                ? [customGasFee.maxFeePerGas, customGasFee.maxPriorityFeePerGas]
                : [
                    gasFeeEstimates.high.suggestedMaxFeePerGas,
                    gasFeeEstimates.high.suggestedMaxPriorityFeePerGas,
                ];
            totalGasInWei = tradeGasLimit.times(gweiDecToWEIBN(estimatedBaseFee)
                .add(gweiDecToWEIBN(maxPriorityFeePerGas))
                .toString(16), 16);
            maxTotalGasInWei = tradeMaxGasLimit.times(gweiDecToWEIBN(maxFeePerGas).toString(16), 16);
        }
        // totalGas + trade value
        // trade.value is a sum of different values depending on the transaction.
        // It always includes any external fees charged by the quote source. In
        // addition, if the source asset is NATIVE, trade.value includes the amount
        // of swapped NATIVE.
        const totalInWei = totalGasInWei.plus(trade.value, 16);
        const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
        // if value in trade, NATIVE fee will be the gas, if not it will be the total wei
        const weiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? totalInWei.minus(sourceAmount, 10)
            : totalInWei; // sourceAmount is in wei : totalInWei;
        const maxWeiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? maxTotalInWei.minus(sourceAmount, 10)
            : maxTotalInWei; // sourceAmount is in wei : totalInWei;
        const ethFee = swapsUtil_1.calcTokenAmount(weiFee, 18);
        const maxEthFee = swapsUtil_1.calcTokenAmount(maxWeiFee, 18);
        const decimalAdjustedDestinationAmount = swapsUtil_1.calcTokenAmount(destinationAmount, destinationTokenInfo.decimals);
        // fees
        const tokenPercentageOfPreFeeDestAmount = new bignumber_js_1.BigNumber(100, 10)
            .minus(metaMaskFee, 10)
            .div(100);
        const destinationAmountBeforeMetaMaskFee = decimalAdjustedDestinationAmount.div(tokenPercentageOfPreFeeDestAmount);
        const metaMaskFeeInTokens = destinationAmountBeforeMetaMaskFee.minus(decimalAdjustedDestinationAmount);
        const conversionRate = destinationTokenRate || 1;
        const ethValueOfTokens = decimalAdjustedDestinationAmount.times(conversionRate, 10);
        // the more tokens the better
        const overallValueOfQuote = ethValueOfTokens.minus(ethFee, 10);
        const quoteValues = {
            aggregator,
            tradeGasLimit: tradeGasLimit.toString(10),
            tradeMaxGasLimit: tradeMaxGasLimit.toString(10),
            ethFee: ethFee.toFixed(18),
            maxEthFee: maxEthFee.toFixed(18),
            ethValueOfTokens: ethValueOfTokens.toFixed(18),
            overallValueOfQuote: overallValueOfQuote.toFixed(18),
            metaMaskFeeInEth: metaMaskFeeInTokens.times(conversionRate).toFixed(18),
        };
        return quoteValues;
    }
    /* istanbul ignore next */
    calculatesCustomLimitMaxEthFee(quote, gasFee, gasLimit) {
        const { averageGas, maxGas, sourceAmount, sourceToken, trade, gasEstimateWithRefund, gasEstimate, gasMultiplier, approvalNeeded, } = quote;
        const { tradeMaxGasLimit } = swapsUtil_1.calculateGasLimits(Boolean(approvalNeeded), gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit);
        let gasPrice;
        if (isCustomEthGasPriceEstimate(gasFee) || isEthGasPriceEstimate(gasFee)) {
            gasPrice = gasFee.gasPrice;
        }
        else if (isCustomGasFee(gasFee)) {
            gasPrice = gasFee.maxFeePerGas;
        }
        else {
            gasPrice = gasFee.high.suggestedMaxFeePerGas;
        }
        const maxTotalGasInWei = tradeMaxGasLimit.times(gweiDecToWEIBN(gasPrice).toString(16), 16);
        const maxTotalInWei = maxTotalGasInWei.plus(trade.value, 16);
        const maxWeiFee = sourceToken === swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS
            ? maxTotalInWei.minus(sourceAmount, 10)
            : maxTotalInWei;
        const maxEthFee = swapsUtil_1.calcTokenAmount(maxWeiFee, 18).toFixed(18);
        return maxEthFee;
    }
    /**
     * Find best quote and quotes calculated values
     *
     * @param quotes - Array of quotes
     * @returns - Promise resolving to the best quote object and values from quotes
     */
    /* istanbul ignore next */
    getBestQuoteAndQuotesValues(quotes, gasFeeEstimates, customGasFee) {
        let topAggId = '';
        let overallValueOfBestQuoteForSorting = null;
        const quoteValues = {};
        Object.values(quotes).forEach((quote) => {
            const quoteValue = this.calculateQuoteValues(quote, null, gasFeeEstimates, customGasFee);
            quoteValues[quoteValue.aggregator] = quoteValue;
            const bnOverallValueOfQuote = new bignumber_js_1.BigNumber(quoteValue.overallValueOfQuote);
            if (!overallValueOfBestQuoteForSorting ||
                bnOverallValueOfQuote.gt(overallValueOfBestQuoteForSorting)) {
                topAggId = quote.aggregator;
                overallValueOfBestQuoteForSorting = bnOverallValueOfQuote;
            }
        });
        return { topAggId, quoteValues };
    }
    /**
     * Get current allowance for a wallet address to access ERC20 contract address funds
     * it will throw after 10 secs
     *
     * @param contractAddress - Hex address of the ERC20 contract
     * @param walletAddress - Hex address of the wallet
     * @returns - Promise resolving to allowance number
     */
    /* istanbul ignore next */
    async getERC20Allowance(contractAddress, walletAddress) {
        const contract = this.web3.eth.contract(human_standard_token_abi_1.default).at(contractAddress);
        const allowanceTimeout = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error(swapsUtil_1.SwapsError.SWAPS_ALLOWANCE_TIMEOUT));
            }, 10000);
        });
        const allowancePromise = new Promise((resolve, reject) => {
            contract.allowance(walletAddress, swapsUtil_1.getSwapsContractAddress(this.config.chainId), (error, result) => {
                /* istanbul ignore if */
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
        return Promise.race([
            allowanceTimeout,
            allowancePromise,
        ]);
    }
    /* istanbul ignore next */
    timedoutGasReturn(tradeTxParams) {
        if (!tradeTxParams) {
            return new Promise((resolve) => {
                resolve({ gas: null });
            });
        }
        const gasTimeout = new Promise((resolve) => {
            setTimeout(() => {
                resolve({ gas: null });
            }, 5000);
        });
        return new Promise(async (resolve) => {
            const tradeTxParamsForGasEstimate = {
                data: tradeTxParams.data,
                from: tradeTxParams.from,
                to: tradeTxParams.to,
                value: tradeTxParams.value,
            };
            try {
                const gas = (await Promise.race([
                    swapsUtil_1.estimateGas(tradeTxParamsForGasEstimate, this.ethQuery),
                    gasTimeout,
                ]));
                resolve(gas);
            }
            catch (e) {
                resolve({ gas: null });
            }
        });
    }
    /* istanbul ignore next */
    async pollForNewQuotesWithThreshold(fetchThreshold = 0) {
        this.pollCount += 1;
        this.handle && clearTimeout(this.handle);
        if (this.pollCount < this.config.pollCountLimit + 1) {
            !this.state.isInPolling && this.update({ isInPolling: true });
            const { nextQuotesState, threshold, usedGasEstimate, } = await this.fetchQuotes();
            this.update({
                pollingCyclesLeft: this.config.pollCountLimit - this.pollCount,
            });
            if (threshold && (nextQuotesState === null || nextQuotesState === void 0 ? void 0 : nextQuotesState.quoteRefreshSeconds)) {
                this.update(Object.assign(Object.assign(Object.assign({}, this.state), nextQuotesState), { usedGasEstimate }));
                this.handle = setTimeout(async () => {
                    this.pollForNewQuotesWithThreshold(threshold);
                }, nextQuotesState.quoteRefreshSeconds * 1000 - threshold);
            }
        }
        else {
            this.handle = setTimeout(() => {
                this.stopPollingAndResetState({
                    key: swapsUtil_1.SwapsError.QUOTES_EXPIRED_ERROR,
                    description: null,
                });
            }, fetchThreshold);
        }
    }
    /* istanbul ignore next */
    async getAllQuotesWithGasEstimates(trades) {
        const quoteGasData = await Promise.all(Object.values(trades).map((trade) => {
            return new Promise(async (resolve, reject) => {
                try {
                    const { gas } = await this.timedoutGasReturn(trade.trade);
                    resolve({
                        gas,
                        aggId: trade.aggregator,
                    });
                }
                catch (e) {
                    reject(e);
                }
            });
        }));
        const newQuotes = {};
        quoteGasData.forEach(({ gas, aggId }) => {
            newQuotes[aggId] = Object.assign(Object.assign({}, trades[aggId]), { gasEstimate: gas, gasEstimateWithRefund: swapsUtil_1.calculateGasEstimateWithRefund(trades[aggId].maxGas, trades[aggId].estimatedRefund, gas).toString(16) });
        });
        return newQuotes;
    }
    /* istanbul ignore next */
    async fetchQuotes() {
        var _a, _b, _c;
        const timeStarted = Date.now();
        const { fetchParams } = this.state;
        const { clientId, chainId } = this.config;
        try {
            /** We need to abort quotes fetch if stopPollingAndResetState is called while getting quotes */
            this.abortController = new abort_controller_1.AbortController();
            const { signal } = this.abortController;
            let quotes = await swapsUtil_1.fetchTradesInfo(fetchParams, signal, chainId, clientId);
            if (Object.values(quotes).length === 0) {
                throw new Error(swapsUtil_1.SwapsError.QUOTES_NOT_AVAILABLE_ERROR);
            }
            let approvalTransaction = null;
            const enableDirectWrappingParam = swapsUtil_1.shouldEnableDirectWrapping(chainId, fetchParams.sourceToken, fetchParams.destinationToken);
            const quotesArray = Object.values(quotes);
            const onlyContractQuote = quotesArray.length === 1 && quotesArray[0].aggType === 'CONTRACT';
            const enableDirectWrapping = enableDirectWrappingParam && onlyContractQuote;
            if (fetchParams.sourceToken !== swapsUtil_1.NATIVE_SWAPS_TOKEN_ADDRESS &&
                !enableDirectWrapping) {
                const allowance = await this.getERC20Allowance(fetchParams.sourceToken, fetchParams.walletAddress);
                if (Number(allowance) < fetchParams.sourceAmount) {
                    approvalTransaction =
                        ((_a = quotesArray.find((quote) => quote.approvalNeeded)) === null || _a === void 0 ? void 0 : _a.approvalNeeded) ||
                            null;
                    if (!approvalTransaction) {
                        throw new Error(swapsUtil_1.SwapsError.SWAPS_ALLOWANCE_ERROR);
                    }
                    const { gas: approvalGas } = await this.timedoutGasReturn({
                        data: approvalTransaction.data,
                        from: approvalTransaction.from,
                        to: approvalTransaction.to,
                    });
                    approvalTransaction = Object.assign(Object.assign({}, approvalTransaction), { gas: approvalGas || swapsUtil_1.DEFAULT_ERC20_APPROVE_GAS });
                }
            }
            quotes = await this.getAllQuotesWithGasEstimates(quotes);
            const gasFeeEstimates = await this.getGasPrice();
            const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, gasFeeEstimates);
            const quotesLastFetched = Date.now();
            const nextQuotesState = {
                quotes,
                quotesLastFetched,
                approvalTransaction,
                topAggId: (_b = quotes[topAggId]) === null || _b === void 0 ? void 0 : _b.aggregator,
                quoteValues,
                quoteRefreshSeconds: (_c = quotes[topAggId]) === null || _c === void 0 ? void 0 : _c.quoteRefreshSeconds,
            };
            return {
                nextQuotesState,
                threshold: quotesLastFetched - timeStarted,
                usedGasEstimate: gasFeeEstimates,
            };
        }
        catch (e) {
            const errorKey = Object.values(swapsUtil_1.SwapsError).includes(e.message)
                ? e.message
                : swapsUtil_1.SwapsError.ERROR_FETCHING_QUOTES;
            this.stopPollingAndResetState({ key: errorKey, description: e });
            return {
                nextQuotesState: null,
                threshold: null,
                usedGasEstimate: null,
            };
        }
    }
    set provider(provider) {
        if (provider) {
            this.ethQuery = new eth_query_1.default(provider);
            this.web3 = new web3_1.default(provider);
        }
    }
    set chainId(chainId) {
        if (!this.config.supportedChainIds.includes(chainId)) {
            return;
        }
        const { chainCache } = this.state;
        if ((chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]) === undefined) {
            this.update(Object.assign(Object.assign({}, exports.INITIAL_CHAIN_DATA), { chainCache: getNewChainCache(chainCache, chainId, exports.INITIAL_CHAIN_DATA) }));
            return;
        }
        const cachedData = (chainCache === null || chainCache === void 0 ? void 0 : chainCache[chainId]) || exports.INITIAL_CHAIN_DATA;
        this.update(Object.assign({}, cachedData));
    }
    /**
     * Updates all quotes with a new custom gas price
     *
     * @param customGasFee - Custom gas price in dec gwei format
     */
    updateQuotesWithGasPrice(customGasFee) {
        const { quotes, usedGasEstimate } = this.state;
        if (!usedGasEstimate) {
            return;
        }
        const { topAggId, quoteValues } = this.getBestQuoteAndQuotesValues(quotes, usedGasEstimate, customGasFee);
        this.update({ topAggId, quoteValues, usedCustomGas: customGasFee });
    }
    /**
     * Updates the selected quote maxEthFee param according to a custom gas limit
     *
     * @param customGasLimit - Custom gas limit in hex format
     */
    updateSelectedQuoteWithGasLimit(customGasLimit) {
        const { topAggId, quotes, quoteValues, usedGasEstimate, usedCustomGas, } = this.state;
        if (!topAggId || !quoteValues || !usedGasEstimate) {
            return;
        }
        const selectedQuote = quotes[topAggId];
        const maxEthFee = this.calculatesCustomLimitMaxEthFee(selectedQuote, usedCustomGas || usedGasEstimate, customGasLimit);
        quoteValues[selectedQuote.aggregator].maxEthFee = maxEthFee;
        this.update({ topAggId, quoteValues });
    }
    startFetchAndSetQuotes(fetchParams, fetchParamsMetaData) {
        if (!fetchParams) {
            return null;
        }
        // Every time we get a new request that is not from the polling,
        // we reset the poll count so we can poll for up to three more sets
        // of quotes with these new params.
        this.pollCount = 0;
        this.update({ fetchParams, fetchParamsMetaData });
        this.pollForNewQuotesWithThreshold();
    }
    async fetchTokenWithCache() {
        const { chainId, clientId, fetchTokensThreshold, supportedChainIds, } = this.config;
        const { tokens, tokensLastFetched } = this.state;
        if (!supportedChainIds.includes(chainId)) {
            return;
        }
        if (!tokens || fetchTokensThreshold < Date.now() - tokensLastFetched) {
            const releaseLock = await this.mutex.acquire();
            try {
                const newTokens = await swapsUtil_1.fetchTokens(chainId, clientId);
                const data = { tokens: newTokens, tokensLastFetched: Date.now() };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            catch (_a) {
                const data = { tokensLastFetched: 0 };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            finally {
                releaseLock();
            }
        }
    }
    async fetchTopAssetsWithCache() {
        const { chainId, clientId, fetchTopAssetsThreshold, supportedChainIds, } = this.config;
        const { topAssets, topAssetsLastFetched } = this.state;
        if (!supportedChainIds.includes(chainId)) {
            return;
        }
        if (!topAssets ||
            fetchTopAssetsThreshold < Date.now() - topAssetsLastFetched) {
            const releaseLock = await this.mutex.acquire();
            try {
                const newTopAssets = await swapsUtil_1.fetchTopAssets(chainId, clientId);
                const data = {
                    topAssets: newTopAssets,
                    topAssetsLastFetched: Date.now(),
                };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            catch (_a) {
                const data = { topAssetsLastFetched: 0 };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            finally {
                releaseLock();
            }
        }
    }
    async fetchAggregatorMetadataWithCache() {
        const { chainId, clientId, fetchAggregatorMetadataThreshold, supportedChainIds, } = this.config;
        const { aggregatorMetadata, aggregatorMetadataLastFetched } = this.state;
        if (!supportedChainIds.includes(chainId)) {
            return;
        }
        if (!aggregatorMetadata ||
            fetchAggregatorMetadataThreshold <
                Date.now() - aggregatorMetadataLastFetched) {
            const releaseLock = await this.mutex.acquire();
            try {
                const newAggregatorMetada = await swapsUtil_1.fetchAggregatorMetadata(chainId, clientId);
                const data = {
                    aggregatorMetadata: newAggregatorMetada,
                    aggregatorMetadataLastFetched: Date.now(),
                };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            catch (_a) {
                const data = { aggregatorMetadataLastFetched: 0 };
                this.update(Object.assign(Object.assign({}, data), { chainCache: getNewChainCache(this.state.chainCache, chainId, data) }));
            }
            finally {
                releaseLock();
            }
        }
    }
    /**
     * Stops the polling process
     *
     */
    stopPollingAndResetState(error) {
        this.abortController && this.abortController.abort();
        this.handle && clearTimeout(this.handle);
        this.pollCount = this.config.pollCountLimit + 1;
        this.update(Object.assign(Object.assign({}, this.defaultState), { isInPolling: false, tokensLastFetched: this.state.tokensLastFetched, topAssetsLastFetched: this.state.topAssetsLastFetched, aggregatorMetadataLastFetched: this.state.aggregatorMetadataLastFetched, tokens: this.state.tokens, topAssets: this.state.topAssets, aggregatorMetadata: this.state.aggregatorMetadata, chainCache: this.state.chainCache, error }));
    }
}
exports.default = SwapsController;
//# sourceMappingURL=SwapsController.js.map