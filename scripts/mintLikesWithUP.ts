import { ethers } from "hardhat";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!UP_ADDRESS || !PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Connect to UP and LikesToken contracts
  const universalProfile = new ethers.Contract(UP_ADDRESS, UniversalProfile.abi, signer);
  const likesToken = LikesToken__factory.connect(LIKES_CONTRACT_ADDRESS, signer);

  const lyxAmount = ethers.parseEther("0.1");
  console.log(`💰 Minting LIKES with ${ethers.formatEther(lyxAmount)} LYX from UP`);

  try {
    // Encode the mintLikes function call
    const mintCalldata = likesToken.interface.encodeFunctionData("mintLikes", [UP_ADDRESS]);

    // Execute through UP
    const tx = await universalProfile.execute(
      0,                      // Operation type (CALL)
      LIKES_CONTRACT_ADDRESS, // Target contract
      lyxAmount,             // Value in LYX
      mintCalldata,          // Encoded function call
      { gasLimit: 500000 }
    );

    console.log("⏳ Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ LIKES Minting Successful! Tx Hash: ${receipt.hash}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
