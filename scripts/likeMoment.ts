import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { MomentMetadata__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, MOMENT_ADDRESS, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!PRIVATE_KEY || !MOMENT_ADDRESS || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // Create provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`🔑 Signer Address: ${signer.address}`);

  // Connect to the LikesToken contract
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, signer);

  // Connect to the Moment contract
  const momentContract = MomentMetadata__factory.connect(MOMENT_ADDRESS, signer);

  // Define LIKES amount and comment
  const likesAmount = ethers.parseUnits("10", 18); // Assuming 18 decimals
  const comment = "Loving this moment!"; // User's comment
  console.log(`💙 Sending ${ethers.formatUnits(likesAmount, 18)} LIKES to Moment at: ${MOMENT_ADDRESS}`);

  try {
    // ✅ Step 1: Authorize the Moment contract to receive LIKES
    const authorizeTx = await likesToken.authorizeOperator(MOMENT_ADDRESS, likesAmount, "0x");
    await authorizeTx.wait();
    console.log("✅ Authorized Moment contract to receive LIKES");

    // ✅ Step 2: Call `receiveLikes()` on the Moment contract
    const tx = await momentContract.receiveLikes(likesAmount, comment);

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ LIKES Sent Successfully! Tx Hash: ${receipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Like transaction failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error sending LIKES:", error);
  process.exitCode = 1;
});
