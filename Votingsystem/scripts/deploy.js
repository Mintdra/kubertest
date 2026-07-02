// scripts/deploy.js
// Run with: npx hardhat run scripts/deploy.js --network <network>

const hre = require("hardhat");

async function main() {
  const candidateNames = ["Alice", "Bob", "Carol"];

  console.log("Deploying BallotBox with candidates:", candidateNames);

  const BallotBox = await hre.ethers.getContractFactory("BallotBox");
  const ballotBox = await BallotBox.deploy(candidateNames);
  await ballotBox.waitForDeployment();

  const address = await ballotBox.getAddress();
  console.log("BallotBox deployed to:", address);
  console.log("\nCopy this address into CONTRACT_ADDRESS in vote-index.html");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});