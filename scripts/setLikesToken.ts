import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import { LikesTreasury__factory } from "../typechain-types";

LoadEnv();

const { PRIVATE_KEY, TREASURY_CONTRACT_ADDRESS, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!PRIVATE_KEY || !TREASURY_CONTRACT_ADDRESS || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`🔗 Connecting to Treasury at: ${TREASURY_CONTRACT_ADDRESS}`);
  console.log(`🔗 Setting LikesToken: ${LIKES_CONTRACT_ADDRESS}`);

  // Load the Treasury contract using the factory
  const treasuryContract = LikesTreasury__factory.connect(TREASURY_CONTRACT_ADDRESS, wallet);

  try {
    console.log("🔄 Sending transaction to set LikesToken...");
    const tx = await treasuryContract.setLikesToken(LIKES_CONTRACT_ADDRESS);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();

    console.log(`✅ LikesToken set successfully! Tx Hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Transaction failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error setting LikesToken:", error);
  process.exitCode = 1;
});
