import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import { MomentMetadata__factory } from "../typechain-types";
import MomentMetadataABI from "../artifacts/contracts/MomentMetadata.sol/MomentMetadata.json";

LoadEnv();
const { RPC_URL, MOMENT_ADDRESS } = process.env;

async function main() {
  if (!MOMENT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // 🔗 Connect to Blockchain
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const momentMetadata = new ethers.Contract(MOMENT_ADDRESS, MomentMetadataABI.abi, provider);
  // const momentMetadata = MomentMetadata__factory.connect(MOMENT_ADDRESS, provider);
  

  try {
    // 📌 Get total comments
    const totalComments = await momentMetadata.getTotalComments();
    console.log("📝 Total Comments:", totalComments.toString());

    // 📌 Fetch all comments
    const commentsArray = [];
    for (let i = 0; i < totalComments; i++) {
      const comment = await momentMetadata.getComment(i);
      commentsArray.push({
        sender: comment[0],
        content: comment[1],
        timestamp: new Date(Number(comment[2]) * 1000).toLocaleString(),
      });
    }

    // 📌 Log the comments
    console.log("💬 Comments:", commentsArray);
  } catch (error) {
    console.error("❌ Error fetching comments:", error);
  }
}

// 🚀 Run script
main().catch((error) => {
  console.error("❌ Error running script:", error);
  process.exitCode = 1;
});
