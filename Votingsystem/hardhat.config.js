require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",

  networks: {
    // Built-in local blockchain — starts automatically, no setup needed.
    // Use this for fast development/demo without real testnet ETH.
    hardhat: {},

    // Persistent local node you run yourself with `npx hardhat node`
    // so MetaMask can connect to it in the browser.
    localhost: {
      url: "http://127.0.0.1:8545"
    },

    // Public testnet — needed if you want a real, shareable deployment.
    // Fill in RPC_URL and PRIVATE_KEY in a .env file (see README).
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};