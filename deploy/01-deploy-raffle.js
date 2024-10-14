const { network, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

const FUND_AMOUNT = "100000000000000000000" // 100 LINK token

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId = network.config.chainId
  let vrfCoordinatorV2Plus, vrfCoordinatorV2_5Mock, subscriptionId

  if (developmentChains.includes(network.name)) {
    vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
    vrfCoordinatorV2Plus = vrfCoordinatorV2_5Mock.address
    const transactionResponse = await vrfCoordinatorV2_5Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait()
    subscriptionId = transactionReceipt.logs[0].topics[1]
    // Fund the subscription
    // Our mock makes it so we don't actually have to worry about sending fund
    await vrfCoordinatorV2_5Mock.fundSubscription(subscriptionId, FUND_AMOUNT)
  } else {
    vrfCoordinatorV2Plus = networkConfig[chainId]["vrfCoordinatorV2"]
    subscriptionId = networkConfig[chainId]["subscriptionId"]
  }

  const arguments = [
    vrfCoordinatorV2Plus,
    subscriptionId,
    networkConfig[chainId]["entranceFee"],
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["callbackGasLimit"],
    networkConfig[chainId]["keepersUpdateInterval"]
  ]
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1
  })

  // Ensure the Raffle contract is a valid consumer of the VRFCoordinatorV2_5Mock contract.
  if (developmentChains.includes(network.name)) {
    const vrfCoordinatorV2_5Mock = await ethers.getContract("VRFCoordinatorV2_5Mock")
    await vrfCoordinatorV2_5Mock.addConsumer(subscriptionId, raffle.address)
  }

  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(raffle.address, arguments)
  }
  log("---------------------------------------")
}

module.exports.tags = ["all", "raffle"]