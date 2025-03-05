import { ethers } from "hardhat";
import { MomentURD__factory } from "../typechain-types";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  const [signer] = await ethers.getSigners();
  
  const { MOMENT_URD_ADDRESS, MOMENT_ADDRESS } = process.env;
  
  if (!MOMENT_URD_ADDRESS || !MOMENT_ADDRESS) {
    console.error("❌ Missing URD or Moment address in .env");
    return;
  }

  console.log("📍 URD Address:", MOMENT_URD_ADDRESS);
  console.log("📍 Moment Address:", MOMENT_ADDRESS);
  
  const momentURD = MomentURD__factory.connect(MOMENT_URD_ADDRESS, signer);

  // Convert moment address to bytes32 tokenId
  const momentId = ethers.zeroPadValue(MOMENT_ADDRESS, 32);
  console.log("\n🔍 Looking up moment:", momentId);

  try {
    // Get all likes for the moment
    const likes = await momentURD.getLikes(MOMENT_ADDRESS);
    console.log("\n💖 Likes found:", likes.length);

    if (likes.length > 0) {
      console.log("\nLike details:");
      likes.forEach((like, index) => {
        console.log(`\nLike #${index + 1}:`);
        console.log(`  Sender: ${like.sender}`);
        console.log(`  Amount: ${like.amount}`);
        console.log(`  Comment: ${like.comment}`);
        console.log(`  Timestamp: ${new Date(Number(like.timestamp) * 1000).toLocaleString()}`);
      });
    }

    // Get total likes
    const totalLikes = await momentURD.getTotalLikes(MOMENT_ADDRESS);
    console.log(`\n📊 Total likes: ${totalLikes}`);

  } catch (error) {
    console.error("❌ Error reading likes:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });