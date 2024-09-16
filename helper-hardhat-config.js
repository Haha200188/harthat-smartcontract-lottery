/* Centralize the management of some commonly used 
configurations, constants, network parameters, etc. */
const { ethers } = require("hardhat")

const networkConfig = {
  default: {
    name: "hardhat",
    keepersUpdateInterval: "30",
  },
  31337: {
    name: "localhost",
    subscriptionId: "588",
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    keepersUpdateInterval: "30",
    entranceFee: ethers.utils.parseEther("0.01", 18), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
  },
  11155111: {
    name: "sepolia",
    subscriptionId: "6926",
    gasLane: "0x474e34a077df58807dbe9c96d3c009b23b3c6d0cce433e59bbf5b34f823bc56c", // 30 gwei
    keepersUpdateInterval: "30",
    entranceFee: ethers.utils.parseEther("0.01", 18), // 0.01 ETH
    callbackGasLimit: "500000", // 500,000 gas
    vrfCoordinatorV2: "0x447Fd5eC2D383091C22B8549cb231a3bAD6d3fAf",
  },
  1: {
    name: "mainnet",
    keepersUpdateInterval: "30",
  },
}

const developmentChains = ["hardhat", "localhost"]
const VERIFICATION_BLOCK_CONFIRMATIONS = 6
const frontEndContractsFile = "../nextjs-smartcontract-lottery-fcc/constants/contractAddresses.json"
const frontEndAbiFile = "../nextjs-smartcontract-lottery-fcc/constants/abi.json"

module.exports = {
  networkConfig,
  developmentChains,
  VERIFICATION_BLOCK_CONFIRMATIONS,
  frontEndContractsFile,
  frontEndAbiFile,
}