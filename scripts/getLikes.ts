import { ethers } from "hardhat";
import { config as dotenv } from "dotenv";
import MomentURDABI from "../artifacts/contracts/MomentURD.sol/MomentURD.json";

dotenv();
const { MOMENT_URD_ADDRESS, MOMENT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!MOMENT_URD_ADDRESS || !MOMENT_ADDRESS || !RPC_URL) {
    throw new Error("Missing environment variables");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const momentURD = new ethers.Contract(MOMENT_URD_ADDRESS, MomentURDABI.abi, provider);

  console.log("Querying likes for Moment:", MOMENT_ADDRESS);

  try {
    // Get total likes
    const totalLikes = await momentURD.getTotalLikes(MOMENT_ADDRESS);
    console.log("\n💙 Total Likes:", totalLikes.toString());

    // Get all likes details
    const likes = await momentURD.getLikes(MOMENT_ADDRESS);
    
    console.log("\n📝 Like Details:");
    likes.forEach((like: any, index: number) => {
      console.log(`\nLike #${index + 1}:`);
      console.log("From:", like.sender);
      console.log("Amount:", ethers.formatEther(like.amount));
      console.log("Comment:", like.comment);
      console.log("Time:", new Date(Number(like.timestamp) * 1000).toLocaleString());
    });

  } catch (error) {
    console.error("Error fetching likes:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 