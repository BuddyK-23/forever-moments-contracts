import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, signer);

  // Get current ratio
  const currentRatio = await likesToken.likesPerLYX();
  console.log(`📊 Current LIKES per LYX: ${currentRatio}`);

  try {
    // Set new ratio to 17 LIKES per LYX
    const tx = await likesToken.setLikesPerLYX(100);

    console.log("⏳ Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction failed - no receipt");
    }
    console.log(`✅ LIKES per LYX updated! Tx Hash: ${receipt.hash}`);

    // Get new ratio
    const newRatio = await likesToken.likesPerLYX();
    console.log(`📊 New LIKES per LYX: ${newRatio}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 