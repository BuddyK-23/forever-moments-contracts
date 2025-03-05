import { ethers } from "hardhat";

// 📌 Replace with your actual `arg3` data from the transaction
const encodedBytes = "0x294ecd08000000000000000000000000831c3dbf9fa739ade2ea7802d478eacb179c26580000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000006a00006f357c6a0020f0ac3ad0c0a09c4a626a119094e95eba7ee89cb1fd56d48d33ad3e58353b345f697066733a2f2f6261666b72656963786a79693279646d78746c6f6672787a6976677969787665636e657375637965647a346e7a726c77767479377865756870707500000000000000000000000000000000000000000000";

async function main() {
  try {
    console.log("🔍 Raw Encoded Bytes:", encodedBytes);

    // 🔹 Step 1: Remove leading zeros and padding
    let trimmedBytes = encodedBytes.replace(/^(0x)?0+/, "0x");

    // 🔹 Step 2: Convert bytes to string safely
    const comment = ethers.toUtf8String(trimmedBytes);

    console.log("📜 Decoded Comment:", comment);
  } catch (error) {
    console.error("❌ Error decoding comment:", error);
  }
}

main().catch((error) => {
  console.error("❌ Script failed:", error);
  process.exitCode = 1;
});
