const { network, getNamedAccounts, deployments, ethers, waffle } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async function () {
    let raffle, vrfCoordinatorV2Mock
    const chainId = network.config.chainId
    beforeEach(async function () {
      const { deployer } = await getNamedAccounts()
      await deployments.fixture(["all"])
      raffle = await ethers.getContract("Raffle", deployer)
      vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
    })

    describe("constructor", async function () {
      it("Initializes the raffle correctly", async function () {
        const raffleState = await raffle.getRaffleState()
        const interval = await raffle.getInterval()
        assert.equal(raffleState.toString(), "0")
        assert.equal(interval, networkConfig[chainId]["keepersUpdateInterval"])
      })
    })

    describe("enter raffle", async function () {
      it("Reverts when you don't pay enough", async function () {
        await expect(raffle.enterRaffle()).to.be.revertedWith(
          "Raffle_notEnoughETHEntered"
        )
      })
    })
  })