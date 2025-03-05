import { ethers } from "hardhat";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import { LikesToken__factory } from "../typechain-types"; 
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, MOMENT_ADDRESS, DEPLOYED_UP_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!UP_ADDRESS || !PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !MOMENT_ADDRESS || !RPC_URL || !DEPLOYED_UP_ADDRESS) {
    console.error("❌ Missing environment variables");
    return;
  }

  console.log("UP Address:", UP_ADDRESS);
  console.log("Moment Address:", MOMENT_ADDRESS);
  console.log("LIKES Contract:", LIKES_CONTRACT_ADDRESS);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const universalProfile = new ethers.Contract(UP_ADDRESS, UniversalProfile.abi, wallet);
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, wallet);

  const likesAmount = ethers.parseEther("10");
  console.log(`💙 Sending ${ethers.formatEther(likesAmount)} LIKES to Moment`);

  try {
    // Encode comment data
    const comment = "Testing likes storage! 🎉";
    const encodedComment = ethers.toUtf8Bytes(comment);

    // Check UP's LIKES balance before transfer
    const upBalance = await likesToken.balanceOf(UP_ADDRESS);
    console.log("UP LIKES balance:", ethers.formatEther(upBalance));

    // Generate the calldata for token transfer
    const tokenCalldata = likesToken.interface.encodeFunctionData('transfer', [
      UP_ADDRESS,      // From address (UP)
      MOMENT_ADDRESS,  // To address (Moment)
      likesAmount,     // Amount
      true,           // Force parameter
      encodedComment   // Comment data
    ]);

    console.log("Token calldata:", tokenCalldata);
    console.log("UP executing transfer from:", UP_ADDRESS);
    console.log("To Moment:", MOMENT_ADDRESS);
    console.log("Amount:", ethers.formatEther(likesAmount));

    console.log("Executing transfer through UP...");
    const tx = await universalProfile.execute(
      0,                    // Operation type (CALL)
      LIKES_CONTRACT_ADDRESS, // Target contract
      0,                    // Value in LYX
      tokenCalldata,        // Calldata
      { gasLimit: 500000 }
    );

    const receipt = await tx.wait();
    console.log("Transaction hash:", tx.hash);
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    // Check balance after transfer
    const momentBalance = await likesToken.balanceOf(MOMENT_ADDRESS);
    console.log("Moment LIKES balance:", ethers.formatEther(momentBalance));

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
