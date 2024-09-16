const { run } = require("hardhat")

const verify = async (constructorAddress, args) => {
  console.log("Verify contract...")
  try {
    await run("verify:verify", {
      address: constructorAddress,
      constructorArguments: args
    })
  } catch (e) {
    if (e.message.toLowerCase().includes("already verified")) {
      console.log("Already Verified")
    } else {
      console.log(e)
    }
  }
}