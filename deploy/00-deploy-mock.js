const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")

const BASE_FEE = "250000000000000000" // 0.25 is this the premium in LINK
const GAS_PRICE_LINK = 1e9 // link per gas, 0.000000001 LINK per gas

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  const args = [BASE_FEE, GAS_PRICE_LINK]

  if (developmentChains.includes(network.name)) {
    log("local network detected! Deploying mocks... ")
    // deploy a vrfcoordinator ...
    log("--------", deployer, args)
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args
    })
    log("Mocks deployed!")
    log("-------------------------------")
  }
}

module.exports.tags = ["all", "mocks"]