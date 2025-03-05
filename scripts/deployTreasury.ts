import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import { LikesTreasury__factory } from "../typechain-types";

LoadEnv();
const { PRIVATE_KEY } = process.env;

async function main() {
  if (!PRIVATE_KEY) {
    console.error("❌ Missing PRIVATE_KEY in .env file");
    return;
  }

  // Create provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log("🚀 Deploying Treasury Contract...");

  // Deploy Treasury contract
  const treasuryContract = await new LikesTreasury__factory(signer).deploy();

  const deploymentTx = treasuryContract.deploymentTransaction();
  if (!deploymentTx) {
    console.error("❌ Deployment transaction not found.");
    return;
  }

  console.log("⏳ Waiting for deployment confirmation...");
  await deploymentTx.wait(1);

  const treasuryAddress = await treasuryContract.getAddress();
  console.log(`✅ Treasury Contract Deployed at: ${treasuryAddress}`);

  console.log("🎯 Save this Treasury address to your .env file for future use!");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
