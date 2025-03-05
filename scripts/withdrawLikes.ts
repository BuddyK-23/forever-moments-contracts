import { ethers } from "hardhat";
import { MomentMetadata__factory } from "../typechain-types";
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, MOMENT_ADDRESS, RPC_URL, UP_ADDRESS } = process.env;

async function main() {
  if (!PRIVATE_KEY || !MOMENT_ADDRESS || !RPC_URL || !UP_ADDRESS) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // 🔗 Connect to the blockchain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`🔑 Controller Address: ${wallet.address}`);

  // Connect to the UP contract using the UniversalProfile ABI
  const upContract = new ethers.Contract(
    UP_ADDRESS,
    UniversalProfileArtifact.abi,
    wallet
  );

  // Connect to the Moment contract (for ABI)
  const momentContract = MomentMetadata__factory.connect(MOMENT_ADDRESS, wallet);

  // 📌 Define Withdrawal Amount
  const withdrawAmount = ethers.parseUnits("5", 18); // Withdraw 5 LIKES

  // Encode the withdrawLikes function call
  const withdrawData = momentContract.interface.encodeFunctionData("withdrawLikes", [withdrawAmount]);

  console.log(`💸 Withdrawing ${ethers.formatUnits(withdrawAmount, 18)} LIKES from Moment via UP...`);

  try {
    const tx = await upContract.execute(0, MOMENT_ADDRESS, 0, withdrawData);
    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ Withdrawal Successful! Tx Hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Withdrawal failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error withdrawing LIKES:", error);
  process.exitCode = 1;
});
