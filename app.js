const userConfig = require("./user-config.json");
const blockchainConfig = require("./blockchain-config.json");
const ArbitratorNode = require("./src/ArbitratorNode.js")

let EthNode = new ArbitratorNode(
    blockchainConfig.eth.name,
    blockchainConfig.eth.chainId,
    userConfig.ethNode.rpcAddress,
    userConfig.bscNode.rpcAddress,
    blockchainConfig.eth.contractAddress,
    blockchainConfig.bsc.contractAddress,
    blockchainConfig.eth.hashTokenAddress,
    userConfig.ethNode.privateKey,
    blockchainConfig.contractAbi,
    blockchainConfig.hashTokenAbi,
    blockchainConfig.eth.loopTimeout,
    blockchainConfig.eth.pendingTimeout
);
EthNode.arbitrate();

let BscNode = new ArbitratorNode(
    blockchainConfig.bsc.name,
    blockchainConfig.bsc.chainId,
    userConfig.bscNode.rpcAddress,
    userConfig.ethNode.rpcAddress,
    blockchainConfig.bsc.contractAddress,
    blockchainConfig.eth.contractAddress,
    blockchainConfig.bsc.hashTokenAddress,
    userConfig.bscNode.privateKey,
    blockchainConfig.contractAbi,
    blockchainConfig.hashTokenAbi,
    blockchainConfig.bsc.loopTimeout,
    blockchainConfig.bsc.pendingTimeout
);
BscNode.arbitrate();