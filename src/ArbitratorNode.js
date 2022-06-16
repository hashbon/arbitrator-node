const Web3 = require("web3");

class ArbitratorNode
{
    constructor(chainId, chains, nodes, contractAbi, hashTokenAbi) {
        this.chainId = chainId;
        this.name = chains[chainId].name;
        this.hashTokenAddress = chains[chainId].hashTokenAddress;
        this.web3 = {};
        this.contracts = {};
        for (let id in chains) {
            if (chains.hasOwnProperty(id) && nodes.hasOwnProperty(id)) {
                this.web3[id] = new Web3(nodes[id].rpcAddress);
                this.contracts[id] = new this.web3[id].eth.Contract(contractAbi, chains[id].contractAddress);
            }
        }
        this.ordersWeb3 = this.web3[chainId];
        this.hashTokenContract = new this.ordersWeb3.eth.Contract(hashTokenAbi, this.hashTokenAddress);
        this.ordersContract = this.contracts[chainId];
        this.ordersContractAddress = chains[chainId].contractAddress;
        this.arbitratorAccount = this.ordersWeb3.eth.accounts.privateKeyToAccount(nodes[chainId].privateKey);
        this.loopTimeout = chains[chainId].loopTimeout;
        this.pendingTimeout = chains[chainId].pendingTimeout;
        this.processedOrders = [];
        this.pendingOrders = {};
        this.hashTokensApproved = false;
    }

    arbitrate() {
        this.ordersContract.methods.minVoteWeight().call().then(minVoteWeight => {
            //Checking the HASH token allowance
            return this.hashTokenContract.methods.allowance(
                this.arbitratorAccount.address,
                this.ordersContractAddress
            ).call().then(allowance => {
                return allowance >= minVoteWeight;
            }).catch(error => {
                this.log("Allowance checking error", error);
                return null;
            });
        }).catch(error => {
            this.log("Min vote weight getting error", error);
            return null;
        }).then(approved => {
            //Making the HASH token approve
            if (approved === null) {
                return null;
            }
            return approved ? true : this.approveHashTokens();
        }).then(approved => {
            //Getting an orderId for the arbitration
            return !approved ? null : this.ordersContract.methods.getOrderIdForArbitration(
                this.arbitratorAccount.address,
                this.getStartId()
            ).call().then(result => {
                this.log("Looking for the order");
                return !result[1] ? null : result[0];
            }).catch(error => {
                this.log("Order getting error", error);
                return null;
            });
        }).then(orderId => {
            //Getting the Order entity by the orderId
            return orderId === null ? null : this.ordersContract.methods.orders(orderId).call().then(order => {
                order.orderId = orderId;
                return order;
            }).catch(error => {
                this.log("Order getting error", error);
                return null;
            });
        }).then(order => {
            //Getting the payToken property from the Offer entity
            return !order ? null : this.ordersContract.methods.offers(order.offerId).call().then(offer => {
                order.payChainId = offer.payChainId;
                order.payToken = offer.payToken;
                this.log("Order for arbitration", order);
                return order;
            }).catch(error => {
                this.log("Offer getting error", error);
                return null;
            });
        }).then(order => {
            //Checking the Payment
            return !order ? null : this.contracts[order.payChainId].methods.checkPayment(
                this.chainId,
                order.orderId,
                order.payAmount,
                order.payToken,
                order.payAddress
            ).call().then(success => {
                this.log(success ? "Order is successfully paid" : "Order is not paid");
                order.success = success;
                return order;
            }).catch(error => {
                this.log("Payment checking error", error);
                return null;
            });
        }).then(order => {
            //Voting
            if (order && order.success === true) {
                return this.vote(order);
            } else if (order && order.success === false) {
                if (!this.pendingOrders[order.orderId]) {
                    this.log("Skipping, adding to the pending list");
                    this.pendOrder(order);
                } else if (order.votesFor > 0) {
                    return this.vote(order);
                } else {
                    this.log("Skipping");
                    this.pendOrder(order);
                }
            }
        }).then(() => {
            //Timeout for the next iteration
            return new Promise(resolve => {
                setTimeout(resolve, this.loopTimeout)
            });
        }).then(() => {
            //Next iteration
            this.arbitrate();
        });
    }

    vote(order) {
        this.log("Voting");
        return this.sendContractMethodCall(this.ordersContractAddress, this.ordersContract.methods.vote(
            order.orderId,
            order.success
        )).then(success => {
            if (success) {
                this.log("Successfully voted");
                this.processedOrders.push(order.orderId);
                delete this.pendingOrders[order.orderId];
            } else {
                this.pendOrder(order);
            }
            return success;
        });
    }

    approveHashTokens() {
        if (this.hashTokensApproved) {
            return false;
        }
        this.log("Approving HASH tokens");
        return this.sendContractMethodCall(this.hashTokenAddress, this.hashTokenContract.methods.approve(
            this.ordersContractAddress,
            "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
        )).then(success => {
            if (success) {
                this.log("Successfully approved");
            }
            this.hashTokensApproved = success;
            return success;
        });
    }

    sendContractMethodCall(contractAddress, contractCall) {
        return this.checkContractCall(contractCall).then(success => {
            return !success ? 0 : this.getEstimateGas(contractCall);
        }).then(gas => {
            return !gas ? null : this.signContractCall(contractAddress, contractCall, gas, this.chainId);
        }).then(result => {
            return !result ? false : this.sendSignedTransaction(result.rawTransaction);
        });
    }

    checkContractCall(contractCall) {
        return contractCall.call({from: this.arbitratorAccount.address}).then(() => {
            return true;
        }).catch(error => {
            this.log("Contract method calling error", error);
            return false;
        });
    }

    getEstimateGas(contractCall) {
        return contractCall.estimateGas({from: this.arbitratorAccount.address});
    }

    signContractCall(contractAddress, contractCall, gas, chainId) {
        return this.arbitratorAccount.signTransaction({
            from: this.arbitratorAccount.address,
            to: contractAddress,
            data: contractCall.encodeABI(),
            gas: gas,
            chainId: chainId
        }).then(result => {
            return result;
        }).catch(error => {
            this.log("Transaction signing error", error);
            return null;
        });
    }

    sendSignedTransaction(signedTx) {
        return this.ordersWeb3.eth.sendSignedTransaction(signedTx).then(result => {
            this.log("Transaction sent", result.transactionHash);
            return true;
        }).catch(error => {
            this.log("Transaction sending error", error);
            return false;
        });
    }

    log(message, data = null) {
        console.log(this.name + " [" + (new Date().toLocaleString()) +  "]: " + message + (data ? ":" : ""));
        if (data) {
            console.log(data);
        }
    }

    getStartId() {
        let currentTime = Date.now();
        let startId = 0;
        for (let id in this.pendingOrders) {
            if (this.pendingOrders[id] < currentTime) {
                return id;
            } else if (parseInt(id) >= startId) {
                startId = parseInt(id) + 1;
            }
        }
        for (let i = 0; i < this.processedOrders.length; i++) {
            if (parseInt(this.processedOrders[i]) >= startId) {
                startId = parseInt(this.processedOrders[i]) + 1;
            }
        }
        return startId;
    }

    pendOrder(order) {
        this.pendingOrders[order.orderId] = Date.now() + this.pendingTimeout;
    }
}

module.exports = ArbitratorNode;