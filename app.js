const userConfig = require("./user-config.json");
const blockchainConfig = require("./blockchain-config.json");
const ArbitratorNode = require("./src/ArbitratorNode.js")

for (let chainId in userConfig) {
    if (userConfig.hasOwnProperty(chainId)) {
        let node = new ArbitratorNode(
            chainId,
            blockchainConfig.chains,
            userConfig,
            blockchainConfig.contractAbi,
            blockchainConfig.hashTokenAbi
        );
        node.arbitrate();
    }
}