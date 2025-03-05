import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!UP_ADDRESS || !PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`🔑 Controller Address: ${signer.address}`);

  // Connect to the deployed LikesToken contract
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, signer);

  // Define LYX amount to send (e.g., 0.5 LYX)
  const lyxAmount = ethers.parseEther("0.1");

  console.log(`💰 Sending ${ethers.formatEther(lyxAmount)} LYX to LikesToken Contract at: ${LIKES_CONTRACT_ADDRESS}`);

  try {
    const tx = await likesToken.mintLikes(UP_ADDRESS, { value: lyxAmount });

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    if (!receipt) {
      throw new Error("Transaction failed - no receipt");
    }
    console.log(`✅ LIKES Minting Successful! Tx Hash: ${receipt.hash}`);
  } catch (error) {
    console.error("❌ Transaction failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error minting LIKES:", error);
  process.exitCode = 1;
});
