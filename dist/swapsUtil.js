"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.constructTxParams = exports.estimateGas = exports.calcTokenAmount = exports.calculateGasLimits = exports.getMedianEthValueQuote = exports.getMedian = exports.getSwapsTokensReceived = exports.calculateGasEstimateWithRefund = exports.fetchGasPrices = exports.fetchSwapsFeatureLiveness = exports.fetchTopAssets = exports.fetchAggregatorMetadata = exports.fetchTokens = exports.fetchTradesInfo = exports.getTokenMetadataURL = exports.getBaseApiURL = exports.shouldEnableDirectWrapping = exports.isValidContractAddress = exports.getSwapsContractAddress = exports.getNativeSwapsToken = exports.SwapsError = void 0;
const controllers_1 = require("@metamask/controllers");
const bignumber_js_1 = require("bignumber.js");
const ethereumjs_util_1 = require("ethereumjs-util");
const constants_1 = require("./constants");
const swapsInterfaces_1 = require("./swapsInterfaces");
__exportStar(require("./constants"), exports);
const { handleFetch, timeoutFetch, BNToHex, query, normalizeTransaction, } = controllers_1.util;
var SwapsError;
(function (SwapsError) {
    SwapsError["QUOTES_EXPIRED_ERROR"] = "quotes-expired";
    SwapsError["SWAP_FAILED_ERROR"] = "swap-failed-error";
    SwapsError["ERROR_FETCHING_QUOTES"] = "error-fetching-quotes";
    SwapsError["QUOTES_NOT_AVAILABLE_ERROR"] = "quotes-not-available";
    SwapsError["OFFLINE_FOR_MAINTENANCE"] = "offline-for-maintenance";
    SwapsError["SWAPS_FETCH_ORDER_CONFLICT"] = "swaps-fetch-order-conflict";
    SwapsError["SWAPS_GAS_PRICE_ESTIMATION"] = "swaps-gas-price-estimation";
    SwapsError["SWAPS_ALLOWANCE_TIMEOUT"] = "swaps-allowance-timeout";
    SwapsError["SWAPS_ALLOWANCE_ERROR"] = "swaps-allowance-error";
})(SwapsError = exports.SwapsError || (exports.SwapsError = {}));
// Functions
function getClientIdHeader(clientId) {
    if (!clientId) {
        return undefined;
    }
    return {
        'X-Client-Id': clientId,
    };
}
function getNativeSwapsToken(chainId) {
    return constants_1.SWAPS_NATIVE_TOKEN_OBJECTS[chainId];
}
exports.getNativeSwapsToken = getNativeSwapsToken;
function getSwapsContractAddress(chainId) {
    return constants_1.SWAPS_CONTRACT_ADDRESSES[chainId];
}
exports.getSwapsContractAddress = getSwapsContractAddress;
function isValidContractAddress(chainId, contract) {
    if (!contract || !constants_1.ALLOWED_CONTRACT_ADDRESSES[chainId]) {
        return false;
    }
    return constants_1.ALLOWED_CONTRACT_ADDRESSES[chainId].some((allowedContract) => contract.toLowerCase() === allowedContract.toLowerCase());
}
exports.isValidContractAddress = isValidContractAddress;
function shouldEnableDirectWrapping(chainId, sourceToken, destinationToken) {
    const wrappedToken = constants_1.SWAPS_WRAPPED_TOKENS_ADDRESSES[chainId];
    const nativeToken = constants_1.SWAPS_NATIVE_TOKEN_OBJECTS[chainId].address;
    return ((sourceToken === wrappedToken && destinationToken === nativeToken) ||
        (sourceToken === nativeToken && destinationToken === wrappedToken));
}
exports.shouldEnableDirectWrapping = shouldEnableDirectWrapping;
const getBaseApiURL = function (type, chainId) {
    const [apiChainId, apiBaseUrl] = chainId === constants_1.SWAPS_TESTNET_CHAIN_ID
        ? [constants_1.ETH_CHAIN_ID, constants_1.DEV_BASE_URL]
        : [chainId, constants_1.API_BASE_URL];
    switch (type) {
        case swapsInterfaces_1.APIType.TRADES:
            return `${apiBaseUrl}/networks/${apiChainId}/trades`;
        case swapsInterfaces_1.APIType.TOKENS:
            return `${apiBaseUrl}/networks/${apiChainId}/tokens`;
        case swapsInterfaces_1.APIType.TOKEN:
            return `${apiBaseUrl}/networks/${apiChainId}/token`;
        case swapsInterfaces_1.APIType.TOP_ASSETS:
            return `${apiBaseUrl}/networks/${apiChainId}/topAssets`;
        case swapsInterfaces_1.APIType.FEATURE_FLAG:
            return `${apiBaseUrl}/featureFlags`;
        case swapsInterfaces_1.APIType.AGGREGATOR_METADATA:
            return `${apiBaseUrl}/networks/${apiChainId}/aggregatorMetadata`;
        case swapsInterfaces_1.APIType.GAS_PRICES:
            return `${constants_1.GAS_API_BASE_URL}/networks/${apiChainId}/gasPrices`;
        default:
            throw new Error('getBaseApiURL requires an api call type');
    }
};
exports.getBaseApiURL = getBaseApiURL;
function getTokenMetadataURL(chainId) {
    return exports.getBaseApiURL(swapsInterfaces_1.APIType.TOKEN, chainId);
}
exports.getTokenMetadataURL = getTokenMetadataURL;
async function fetchTradesInfo({ slippage, sourceToken, sourceAmount, destinationToken, walletAddress, }, abortSignal, chainId, clientId) {
    const urlParams = {
        destinationToken,
        sourceToken,
        sourceAmount,
        slippage,
        timeout: 10000,
        walletAddress,
    };
    if (clientId) {
        urlParams.clientId = clientId;
    }
    if (shouldEnableDirectWrapping(chainId, sourceToken, destinationToken)) {
        urlParams.enableDirectWrapping = true;
    }
    const tradeURL = `${exports.getBaseApiURL(swapsInterfaces_1.APIType.TRADES, chainId)}?${new URLSearchParams(urlParams).toString()}`;
    const tradesResponse = await timeoutFetch(tradeURL, {
        method: 'GET',
        signal: abortSignal,
        headers: getClientIdHeader(clientId),
    }, 15000);
    const trades = (await tradesResponse.json());
    const newQuotes = trades.reduce((aggIdTradeMap, quote) => {
        var _a;
        if (!quote.error &&
            quote.trade &&
            isValidContractAddress(chainId, (_a = quote.trade) === null || _a === void 0 ? void 0 : _a.to)) {
            const constructedTrade = constructTxParams({
                to: quote.trade.to,
                from: quote.trade.from,
                data: quote.trade.data,
                amount: BNToHex(new bignumber_js_1.BigNumber(quote.trade.value)),
                gas: BNToHex(quote.maxGas || new bignumber_js_1.BigNumber(constants_1.MAX_GAS_LIMIT)),
            });
            return Object.assign(Object.assign({}, aggIdTradeMap), { [quote.aggregator]: Object.assign(Object.assign({}, quote), { slippage, trade: constructedTrade }) });
        }
        return aggIdTradeMap;
    }, {});
    return newQuotes;
}
exports.fetchTradesInfo = fetchTradesInfo;
async function fetchTokens(chainId, clientId) {
    const tokenUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.TOKENS, chainId);
    const tokens = await handleFetch(tokenUrl, {
        method: 'GET',
        headers: getClientIdHeader(clientId),
    });
    const filteredTokens = tokens.filter((token) => {
        return token.address !== constants_1.NATIVE_SWAPS_TOKEN_ADDRESS;
    });
    filteredTokens.push(getNativeSwapsToken(chainId));
    return filteredTokens;
}
exports.fetchTokens = fetchTokens;
async function fetchAggregatorMetadata(chainId, clientId) {
    const aggregatorMetadataUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.AGGREGATOR_METADATA, chainId);
    const aggregators = await handleFetch(aggregatorMetadataUrl, {
        method: 'GET',
        headers: getClientIdHeader(clientId),
    });
    return aggregators;
}
exports.fetchAggregatorMetadata = fetchAggregatorMetadata;
async function fetchTopAssets(chainId, clientId) {
    const topAssetsUrl = exports.getBaseApiURL(swapsInterfaces_1.APIType.TOP_ASSETS, chainId);
    const response = await handleFetch(topAssetsUrl, {
        method: 'GET',
        headers: getClientIdHeader(clientId),
    });
    return response;
}
exports.fetchTopAssets = fetchTopAssets;
async function fetchSwapsFeatureLiveness(chainId, clientId) {
    const status = await handleFetch(exports.getBaseApiURL(swapsInterfaces_1.APIType.FEATURE_FLAG, chainId), { method: 'GET', headers: getClientIdHeader(clientId) });
    const networkName = constants_1.CHAIN_ID_TO_NAME_MAP[chainId];
    return status[networkName];
}
exports.fetchSwapsFeatureLiveness = fetchSwapsFeatureLiveness;
/**
 * Fetches gas prices from API URL
 * @param chainId Current chainId
 * @returns Gas prices represented as decimal GWEI strings
 */
async function fetchGasPrices(chainId, clientId) {
    const { SafeGasPrice, ProposeGasPrice, FastGasPrice } = await handleFetch(exports.getBaseApiURL(swapsInterfaces_1.APIType.GAS_PRICES, chainId), {
        method: 'GET',
        headers: getClientIdHeader(clientId),
    });
    return {
        safeGasPrice: SafeGasPrice,
        proposedGasPrice: ProposeGasPrice,
        fastGasPrice: FastGasPrice,
    };
}
exports.fetchGasPrices = fetchGasPrices;
function calculateGasEstimateWithRefund(maxGas, estimatedRefund, estimatedGas) {
    const estimated = estimatedGas && ethereumjs_util_1.addHexPrefix(estimatedGas);
    const maxGasMinusRefund = new bignumber_js_1.BigNumber(maxGas || constants_1.MAX_GAS_LIMIT, 10).minus(estimatedRefund || 0);
    const estimatedGasBN = new bignumber_js_1.BigNumber(estimated || '0x0');
    const gasEstimateWithRefund = maxGasMinusRefund.lt(estimatedGasBN)
        ? maxGasMinusRefund
        : estimatedGasBN;
    return gasEstimateWithRefund;
}
exports.calculateGasEstimateWithRefund = calculateGasEstimateWithRefund;
/**
 * Calculates token received from a transaction receipt together with an approval transaction receipt
 *
 * @param receipt - Swap transaction receipt
 * @param approvalReceipt - Approval transaction receipt needed for swaps if any
 * @param transaction - Swap transaction object
 * @param approvalTransaction - Approval transaction object needed for swaps if any
 * @param destinationToken - Destination token object
 * @param previousBalance - Previous swap ETH balance
 * @param postBalance - Post swap ETH balance
 * @returns - Tokens received in hex minimal unit
 */
function getSwapsTokensReceived(receipt, approvalReceipt, transaction, approvalTransaction, destinationToken, previousBalance, postBalance) {
    if (destinationToken.address === constants_1.NATIVE_SWAPS_TOKEN_ADDRESS) {
        const approvalTransactionGasCost = new bignumber_js_1.BigNumber((approvalTransaction === null || approvalTransaction === void 0 ? void 0 : approvalTransaction.gasPrice) || '0x0').times((approvalReceipt === null || approvalReceipt === void 0 ? void 0 : approvalReceipt.gasUsed) || '0x0');
        const transactionGas = new bignumber_js_1.BigNumber((transaction === null || transaction === void 0 ? void 0 : transaction.gasPrice) || '0x0').times((receipt === null || receipt === void 0 ? void 0 : receipt.gasUsed) || '0x0');
        const totalGasCost = transactionGas.plus(approvalTransactionGasCost);
        const previousBalanceMinusGas = new bignumber_js_1.BigNumber(previousBalance).minus(totalGasCost);
        const postBalanceMinusGas = new bignumber_js_1.BigNumber(postBalance);
        return postBalanceMinusGas.minus(previousBalanceMinusGas).toString(16);
    }
    if (!(receipt === null || receipt === void 0 ? void 0 : receipt.logs) || receipt.status === '0x0') {
        return;
    }
    const tokenTransferLog = receipt.logs.find((receiptLog) => {
        var _a;
        const isTokenTransfer = (receiptLog === null || receiptLog === void 0 ? void 0 : receiptLog.topics[0]) === constants_1.TOKEN_TRANSFER_LOG_TOPIC_HASH;
        const isTransferFromGivenToken = receiptLog.address === destinationToken.address;
        const isTransferFromGivenAddress = (_a = receiptLog === null || receiptLog === void 0 ? void 0 : receiptLog.topics[2]) === null || _a === void 0 ? void 0 : _a.match(transaction.from.slice(2));
        return (isTokenTransfer &&
            isTransferFromGivenToken &&
            isTransferFromGivenAddress);
    });
    if (!tokenTransferLog) {
        return;
    }
    return tokenTransferLog.data;
}
exports.getSwapsTokensReceived = getSwapsTokensReceived;
/**
 * Calculates the median of a sample of BigNumber values.
 *
 * @param {BigNumber[]} values - A sample of BigNumber values.
 * @returns {BigNumber} The median of the sample.
 */
function getMedian(values) {
    if (!Array.isArray(values) || values.length === 0) {
        throw new Error('Expected non-empty array param.');
    }
    const sorted = [...values].sort((a, b) => a.comparedTo(b));
    if (sorted.length % 2 === 1) {
        // return middle value
        return sorted[(sorted.length - 1) / 2];
    }
    // return mean of middle two values
    const upperIndex = sorted.length / 2;
    return sorted[upperIndex].plus(sorted[upperIndex - 1]).div(2);
}
exports.getMedian = getMedian;
/**
 * Calculates the median overallValueOfQuote of a sample of quotes.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth, and ethValueOfTokens properties
 * @returns {Object} An object with the ethValueOfTokens, ethFee, and metaMaskFeeInEth of the quote with the median overallValueOfQuote
 */
function getMedianEthValueQuote(quotes) {
    if (!Array.isArray(quotes) || quotes.length === 0) {
        throw new Error('Expected non-empty array param.');
    }
    quotes.sort((quoteA, quoteB) => {
        const overallValueOfQuoteA = new bignumber_js_1.BigNumber(quoteA.overallValueOfQuote, 10);
        const overallValueOfQuoteB = new bignumber_js_1.BigNumber(quoteB.overallValueOfQuote, 10);
        return overallValueOfQuoteA.comparedTo(overallValueOfQuoteB);
    });
    if (quotes.length % 2 === 1) {
        // return middle values
        const medianOverallValue = quotes[(quotes.length - 1) / 2].overallValueOfQuote;
        const quotesMatchingMedianQuoteValue = quotes.filter((quote) => medianOverallValue === quote.overallValueOfQuote);
        return meansOfQuotesFeesAndValue(quotesMatchingMedianQuoteValue);
    }
    // return mean of middle two values
    const upperIndex = quotes.length / 2;
    const lowerIndex = upperIndex - 1;
    const overallValueAtUpperIndex = quotes[upperIndex].overallValueOfQuote;
    const overallValueAtLowerIndex = quotes[lowerIndex].overallValueOfQuote;
    const quotesMatchingUpperIndexValue = quotes.filter((quote) => overallValueAtUpperIndex === quote.overallValueOfQuote);
    const quotesMatchingLowerIndexValue = quotes.filter((quote) => overallValueAtLowerIndex === quote.overallValueOfQuote);
    const feesAndValueAtUpperIndex = meansOfQuotesFeesAndValue(quotesMatchingUpperIndexValue);
    const feesAndValueAtLowerIndex = meansOfQuotesFeesAndValue(quotesMatchingLowerIndexValue);
    return {
        ethFee: new bignumber_js_1.BigNumber(feesAndValueAtUpperIndex.ethFee, 10)
            .plus(feesAndValueAtLowerIndex.ethFee, 10)
            .dividedBy(2)
            .toString(10),
        metaMaskFeeInEth: new bignumber_js_1.BigNumber(feesAndValueAtUpperIndex.metaMaskFeeInEth, 10)
            .plus(feesAndValueAtLowerIndex.metaMaskFeeInEth, 10)
            .dividedBy(2)
            .toString(10),
        ethValueOfTokens: new bignumber_js_1.BigNumber(feesAndValueAtUpperIndex.ethValueOfTokens, 10)
            .plus(feesAndValueAtLowerIndex.ethValueOfTokens, 10)
            .dividedBy(2)
            .toString(10),
    };
}
exports.getMedianEthValueQuote = getMedianEthValueQuote;
/**
 * Calculates the arithmetic mean for each of three properties - ethFee, metaMaskFeeInEth and ethValueOfTokens - across
 * an array of objects containing those properties.
 *
 * @param {Array} quotes - A sample of quote objects with overallValueOfQuote, ethFee, metaMaskFeeInEth and
 * ethValueOfTokens properties
 * @returns {Object} An object with the arithmetic mean each of the ethFee, metaMaskFeeInEth and ethValueOfTokens of
 * the passed quote objects
 */
function meansOfQuotesFeesAndValue(quotes) {
    const feeAndValueSumsAsBigNumbers = quotes.reduce((feeAndValueSums, quote) => ({
        ethFee: feeAndValueSums.ethFee.plus(quote.ethFee, 10),
        metaMaskFeeInEth: feeAndValueSums.metaMaskFeeInEth.plus(quote.metaMaskFeeInEth, 10),
        ethValueOfTokens: feeAndValueSums.ethValueOfTokens.plus(quote.ethValueOfTokens, 10),
    }), {
        ethFee: new bignumber_js_1.BigNumber(0, 10),
        metaMaskFeeInEth: new bignumber_js_1.BigNumber(0, 10),
        ethValueOfTokens: new bignumber_js_1.BigNumber(0, 10),
    });
    return {
        ethFee: feeAndValueSumsAsBigNumbers.ethFee
            .div(quotes.length, 10)
            .toString(10),
        metaMaskFeeInEth: feeAndValueSumsAsBigNumbers.metaMaskFeeInEth
            .div(quotes.length, 10)
            .toString(10),
        ethValueOfTokens: feeAndValueSumsAsBigNumbers.ethValueOfTokens
            .div(quotes.length, 10)
            .toString(10),
    };
}
function calculateGasLimits(approvalNeeded, gasEstimateWithRefund, gasEstimate, averageGas, maxGas, gasMultiplier, gasLimit) {
    let tradeGasLimit, tradeMaxGasLimit;
    const customGasLimit = gasLimit && new bignumber_js_1.BigNumber(gasLimit, 16);
    if (!approvalNeeded &&
        gasEstimate &&
        gasEstimateWithRefund &&
        gasEstimateWithRefund !== '0') {
        tradeGasLimit = new bignumber_js_1.BigNumber(gasEstimateWithRefund, 16);
        tradeMaxGasLimit =
            customGasLimit ||
                new bignumber_js_1.BigNumber(gasEstimate).times(gasMultiplier).integerValue();
    }
    else {
        tradeGasLimit = new bignumber_js_1.BigNumber(averageGas || constants_1.MAX_GAS_LIMIT, 10);
        tradeMaxGasLimit =
            customGasLimit || new bignumber_js_1.BigNumber(maxGas || constants_1.MAX_GAS_LIMIT, 10);
    }
    return { tradeGasLimit, tradeMaxGasLimit };
}
exports.calculateGasLimits = calculateGasLimits;
function calcTokenAmount(value, decimals) {
    const multiplier = Math.pow(10, Number(decimals || 0));
    return new bignumber_js_1.BigNumber(value).div(multiplier);
}
exports.calcTokenAmount = calcTokenAmount;
/**
 * Estimates required gas for a given transaction
 *
 * @param transaction - Transaction object to estimate gas for
 * @returns - Promise resolving to an object containing gas and gasPrice
 */
async function estimateGas(transaction, ethQuery) {
    const estimatedTransaction = Object.assign({}, transaction);
    const { value, data } = estimatedTransaction;
    const { gasLimit } = await query(ethQuery, 'getBlockByNumber', [
        'latest',
        false,
    ]);
    estimatedTransaction.data = !data
        ? data
        : /* istanbul ignore next */ ethereumjs_util_1.addHexPrefix(data);
    // 3. If this is a contract address, safely estimate gas using RPC
    estimatedTransaction.value =
        typeof value === 'undefined' ? '0x0' : /* istanbul ignore next */ value;
    const gasHex = await query(ethQuery, 'estimateGas', [estimatedTransaction]);
    return { blockGasLimit: gasLimit, gas: ethereumjs_util_1.addHexPrefix(gasHex) };
}
exports.estimateGas = estimateGas;
/**
 * Given the standard set of information about a transaction, returns a transaction properly formatted for
 * publishing via JSON RPC and web3
 *
 * @param {boolean} [sendToken] - Indicates whether or not the transaciton is a token transaction
 * @param {string} data - A hex string containing the data to include in the transaction
 * @param {string} to - A hex address of the tx recipient address
 * @param {string} amount - A hex amount, in case of a token tranaction will be set to Tx value
 * @param {string} from - A hex address of the tx sender address
 * @param {string} gas - A hex representation of the gas value for the transaction
 * @param {string} gasPrice - A hex representation of the gas price for the transaction
 * @returns {object} An object ready for submission to the blockchain, with all values appropriately hex prefixed
 */
function constructTxParams({ sendToken, data, to, amount, from, gas, gasPrice, }) {
    const txParams = {
        data,
        from,
        value: '0',
        gas,
        gasPrice,
    };
    if (!sendToken) {
        txParams.value = amount;
        txParams.to = to;
    }
    return normalizeTransaction(txParams);
}
exports.constructTxParams = constructTxParams;
//# sourceMappingURL=swapsUtil.js.map