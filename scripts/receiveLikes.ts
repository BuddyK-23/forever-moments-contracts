import { ethers } from "hardhat";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import { LikesToken__factory, MomentMetadata__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, MOMENT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!UP_ADDRESS || !PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !MOMENT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // 🔗 Connect to the blockchain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`🔑 Controller Address: ${wallet.address}`);

  // 📌 Instantiate Universal Profile & Contracts
  const universalProfile = new ethers.Contract(UP_ADDRESS, UniversalProfile.abi, wallet);
  const likesToken = new ethers.Contract(LIKES_CONTRACT_ADDRESS, LikesToken__factory.createInterface(), wallet);
  const momentContract = new ethers.Contract(MOMENT_ADDRESS, MomentMetadata__factory.createInterface(), wallet);

  // 📌 Define Likes Amount
  const likesAmount = ethers.parseUnits("10", 18); // 10 LIKES tokens

  console.log(`💙 Authorizing Moment contract to transfer ${ethers.formatUnits(likesAmount, 18)} LIKES on behalf of user...`);

  try {
    // Step 1️⃣: Authorize the Moment contract as an operator
    const authorizeTx = await universalProfile.execute(
      0, // Operation type (CALL)
      LIKES_CONTRACT_ADDRESS, // LikesToken contract
      0, // Amount in LYX
      likesToken.interface.encodeFunctionData("authorizeOperator", [
        MOMENT_ADDRESS, // Operator (Moment contract)
        likesAmount, // Amount to authorize
        "0x", // Additional data
      ]),
      { gasLimit: 500000, from: wallet.address }
    );
    await authorizeTx.wait();
    console.log("✅ Moment contract authorized to transfer LIKES");

    // Step 2️⃣: Encode `receiveLikes` function call
    const receiveLikesCalldata = momentContract.interface.encodeFunctionData("receiveLikes", [
      likesAmount,
      "Loving this moment!",
    ]);

    // Step 3️⃣: Execute `receiveLikes` via UP
    console.log(`💙 Calling receiveLikes on Moment contract via UP...`);
    const receiveLikesTx = await universalProfile.execute(
      0, // Operation type (CALL)
      MOMENT_ADDRESS, // Moment contract
      0, // Amount in LYX
      receiveLikesCalldata, // Encoded function call
      { gasLimit: 500000, from: wallet.address }
    );

    const txReceipt = await receiveLikesTx.wait();
    console.log(`✅ LIKES successfully sent to Moment contract! Tx Hash: ${txReceipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error testing receiveLikes:", error);
  process.exitCode = 1;
});
