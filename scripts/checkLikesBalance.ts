import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { LIKES_CONTRACT_ADDRESS, MOMENT_ADDRESS, RPC_URL } = process.env;

// async function main() {
//   if (!LIKES_CONTRACT_ADDRESS || !MOMENT_ADDRESS || !RPC_URL) {
//     console.error("❌ Missing environment variables. Check your .env file!");
//     return;
//   }

//   // 🔗 Connect to the blockchain
//   const provider = new ethers.JsonRpcProvider(RPC_URL);

//   // Connect to the LikesToken contract
//   const likesToken = new ethers.Contract(LIKES_CONTRACT_ADDRESS, LikesToken__factory.createInterface(), provider);

//   console.log(`🔎 Checking LIKES balance of Moment at: ${MOMENT_ADDRESS}`);

//   try {
//     // Call balanceOf function
//     const balance = await likesToken.balanceOf(MOMENT_ADDRESS);
//     console.log(`💙 Moment LIKES Balance: ${ethers.formatUnits(balance, 18)} LIKES`);

//   } catch (error) {
//     console.error("❌ Error fetching balance:", error);
//   }
// }

// main().catch((error) => {
//   console.error("❌ Error in script:", error);
//   process.exitCode = 1;
// });

async function main() {
  if (!LIKES_CONTRACT_ADDRESS || !MOMENT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const likesToken = new ethers.Contract(
    LIKES_CONTRACT_ADDRESS,
    LikesToken__factory.createInterface(),
    provider
  );

  console.log(`🔎 Checking LIKES balance and comments for Moment at: ${MOMENT_ADDRESS}`);

  try {
    // Fetch balance
    const balance = await likesToken.balanceOf(MOMENT_ADDRESS);
    console.log(`💙 Moment LIKES Balance: ${ethers.formatUnits(balance, 18)} LIKES`);

    // Fetch Transfer events
    const filter = likesToken.filters.Transfer(null, MOMENT_ADDRESS);
    const events = await likesToken.queryFilter(filter, -10000);

    if (events.length === 0) {
      console.log("⚠️ No transfer events found.");
    } else {
      console.log(`🔄 Found ${events.length} transfer events.`);

      const iface = new ethers.Interface(LikesToken__factory.abi); // ✅ Get contract interface

      events.forEach((event, index) => {
        try {
          const logDescription = iface.parseLog(event);

          if (!logDescription) {
            console.log(`⚠️ Skipping event ${index + 1}, unable to parse log.`);
            return;
          }

          const data = logDescription.args?.[4]; // Assuming comment is the 4th argument

          if (data && data !== "0x") {
            console.log(`💬 Comment ${index + 1}:`, ethers.decodeBytes32String(data));
          } else {
            console.log(`❌ No comment in Transfer event ${index + 1}`);
          }
        } catch (err) {
          console.error(`❌ Error decoding event ${index + 1}:`, err);
        }
      });
    }
  } catch (error) {
    console.error("❌ Error fetching data:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error in script:", error);
  process.exitCode = 1;
});
