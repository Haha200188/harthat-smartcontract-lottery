const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async function () {
    let raffle, vrfCoordinatorV2Mock, deployer, raffleEntranceFee, interval
    const chainId = network.config.chainId
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer
      await deployments.fixture(["all"])
      raffle = await ethers.getContract("Raffle", deployer)
      vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
      raffleEntranceFee = await raffle.getEntranceFee()
      interval = await raffle.getInterval()
    })

    describe("constructor", async function () {
      it("initializes the raffle correctly", async function () {
        const raffleState = await raffle.getRaffleState()
        assert.equal(raffleState.toString(), "0")
        assert.equal(interval, networkConfig[chainId]["keepersUpdateInterval"])
      })
    })

    describe("enterRaffle", async function () {
      it("reverts when you don't pay enough", async function () {
        await expect(raffle.enterRaffle()).to.be.revertedWith(
          "Raffle_notEnoughETHEntered"
        )
      })
      it("records players when they enter", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        const playerFromContract = await raffle.getPlayer(0)
        assert.equal(playerFromContract, deployer)
      })
      it("emits event when enter", async function () {
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
      })
      it("doesn't allow entrance when raffle is calculating", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        // we pretend to be a Chainlink Keeper
        await raffle.performUpkeep([]) // changes the state to calculating for our comparison below
        await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith( // is reverted as raffle is calculating
          "Raffle_notOpen"
        )
      })
    })

    describe("checkUpKeep", async function () {
      it("returns false if people don't sent any ETH", async function () {
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(!upkeepNeeded)
      })
      it("returns false when raffle isn't open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        await raffle.performUpkeep([])
        const raffleState = await raffle.getRaffleState()
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert.equal(raffleState.toString(), "1")
        assert(!upkeepNeeded)
      })
      it("returns false if enough time hasn't passed", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
        await network.provider.send("evm_mine", [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(!upkeepNeeded)
      })
      it("returns true if enough time has passed, has players, eth, and raffle is open", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
        assert(upkeepNeeded)
      })
    })

    describe("performUpkeep", async function () {
      it("can only run if checkupkeep is true", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        const tx = await raffle.performUpkeep([])
        assert(tx)
      })
      it("reverts when upkeepNeeded is false", async function () {
        await expect(raffle.performUpkeep([])).to.be.revertedWith(
          "Raffle_UpkeepNoNeeded"
        )
      })
      it("updates the raffle state and emits a requestId", async function () {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.send("evm_mine", [])
        const txResponse = await raffle.performUpkeep([])
        const txReceipt = await txResponse.wait(1)
        const requestId = txReceipt.events[1].args.requestId
        const raffleState = await raffle.getRaffleState()
        assert(requestId.toNumber() > 0)
        assert.equal(raffleState.toString(), "1")
        await expect(txResponse).to.emit(raffle, "RequestedRaffleWinner")
      })
    })
    describe("fulfillRandomWords", async function () {
      beforeEach(async () => {
        await raffle.enterRaffle({ value: raffleEntranceFee })
        await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
        await network.provider.request({ method: "evm_mine", params: [] })
      })
      it("can only be called after performupkeep", async function () {
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
        ).to.be.revertedWith("nonexistent request")
        await expect(
          vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
        ).to.be.revertedWith("nonexistent request")
      })
      it("picks a winner, resets, and sends money", async function () {
        const additionalEntrances = 3
        const startingIndex = 1
        const accounts = await ethers.getSigners()
        let winnerIndex, winnerEndingBalance
        let startingBalance = []
        const startingTimestamp = await raffle.getLatestTimestamp()
        for (i = startingIndex; i < startingIndex + additionalEntrances; i++) {
          const raffleConnectedAccount = raffle.connect(accounts[i])
          await raffleConnectedAccount.enterRaffle({ value: raffleEntranceFee })
        }
        await new Promise(async (resolve, reject) => {
          raffle.once("WinnerPicked", async () => {  // event listener for WinnerPicked
            console.log("WinnerPicked event fired!")
            try {
              const raffleState = await raffle.getRaffleState()
              const recentWinner = await raffle.getRecentWinner()
              for (i = 0; i < startingIndex + additionalEntrances; i++) {
                if (recentWinner === accounts[i].address) {
                  winnerIndex = i
                }
              }
              winnerEndingBalance = await accounts[winnerIndex].getBalance()
              const winnerStartingBalance = startingBalance[winnerIndex]
              const endingTimestamp = await raffle.getLatestTimestamp()
              await expect(raffle.getPlayer(0)).to.be.reverted
              assert.equal(raffleState.toString(), "0")
              assert(endingTimestamp > startingTimestamp)
              assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee)).toString())
              resolve()
            } catch (e) {
              reject(e)
            }
          })
          try {
            const txResponse = await raffle.performUpkeep([])
            const txReceipt = await txResponse.wait(1)
            for (i = 0; i < startingIndex + additionalEntrances; i++) {
              startingBalance[i] = await accounts[i].getBalance()
            }
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId, raffle.address
            )
          } catch (e) {
            reject(e)
          }
        })

      })
    })
  })