const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = "10000000000000000"
const GAS_PRICE = 100000000
const WEI_PER_UNIT_LINK = 467045000000000

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const args = [BASE_FEE, GAS_PRICE, WEI_PER_UNIT_LINK]

  if (developmentChains.includes(network.name)) {
    log("local network detected! Deploying mocks... ")
    // deploy a vrfcoordinator ...
    log("--------", deployer, args)
    await deploy("VRFCoordinatorV2_5Mock", {
      from: deployer,
      log: true,
      args: args
    })
    log("Mocks deployed!")
    log("-------------------------------")
  }
}

module.exports.tags = ["all", "mocks"]