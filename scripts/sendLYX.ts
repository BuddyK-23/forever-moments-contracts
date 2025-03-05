import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, RPC_URL, UP_ADDRESS } = process.env;

async function main() {
  if (!PRIVATE_KEY || !RPC_URL || !UP_ADDRESS) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

  console.log(`🔑 Sending LYX from: ${wallet.address}`);

  // Define LYX amount to send (e.g., 0.5 LYX)
  const lyxAmount = ethers.parseEther("0.9");

  console.log(`💰 Sending ${ethers.formatEther(lyxAmount)} LYX to UP_ADDRESS...`);

  try {
    const tx = await wallet.sendTransaction({
      to: UP_ADDRESS,
      value: lyxAmount
    });

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ LYX Transfer Successful! Tx Hash: ${receipt.hash}`);
  } catch (error) {
    console.error("❌ Transaction failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error:", error);
  process.exitCode = 1;
});
