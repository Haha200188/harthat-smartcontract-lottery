// 1. Get our SubId for Chainlink VRF & Fund
// 2. Deploy our contract using the SubId
// 3. Register the contract with Chainlink VRF & it's subId
// 4. Register the contract with Chainlink Keepers
// 5. Run staging tests
const { network, getNamedAccounts, deployments, ethers } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", async function () {
    let raffle, deployer, raffleEntranceFee
    beforeEach(async function () {
      deployer = (await getNamedAccounts()).deployer
      raffle = await ethers.getContract("Raffle", deployer)
      raffleEntranceFee = await raffle.getEntranceFee()
    })

    describe("fulfillRandomWords", function () {
      it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async function () {
        const startingTimestamp = await raffle.getLatestTimestamp()
        const accounts = await ethers.getSigners()
        let winnerStartingBalance
        await new Promise(async (resolve, reject) => {
          raffle.once("WinnerPicked", async () => {
            console.log("WinnerPicked event fired!")
            try {
              const raffleState = await raffle.getRaffleState()
              const recentWinner = await raffle.getRecentWinner()
              const endingTimestamp = await raffle.getLatestTimestamp()
              const winnerEndingBalance = await accounts[0].getBalance()
              assert.equal(raffleState.toString(), "0")
              await expect(raffle.getPlayer(0)).to.be.reverted
              assert(endingTimestamp > startingTimestamp)
              assert.equal(recentWinner, accounts[0].address)
              assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee).toString())
              resolve()
            } catch (e) {
              console.log(e)
              reject(e)
            }
          })
          try {
            const txResponse = await raffle.enterRaffle({ value: raffleEntranceFee })
            await txResponse.wait(1)
            winnerStartingBalance = await accounts[0].getBalance()
          } catch (e) {
            console.log(e)
          }

        })
      })
    })
  })