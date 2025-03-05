import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, signer);

  // Get contract's LYX balance
  const contractBalance = await provider.getBalance(LIKES_CONTRACT_ADDRESS);
  console.log(`💰 Contract LYX Balance: ${ethers.formatEther(contractBalance)} LYX`);

  // Amount to withdraw (e.g., 0.05 LYX)
  const withdrawAmount = ethers.parseEther("0.25");

  try {
    // Call withdrawLYX function
    const tx = await likesToken.withdrawLYX(
      signer.address,  // recipient (controller EOA)
      withdrawAmount
    );

    console.log("⏳ Withdrawal transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ LYX Withdrawal Successful! Tx Hash: ${receipt.hash}`);

    // Get updated balance
    const newBalance = await provider.getBalance(LIKES_CONTRACT_ADDRESS);
    console.log(`💰 Updated Contract Balance: ${ethers.formatEther(newBalance)} LYX`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 