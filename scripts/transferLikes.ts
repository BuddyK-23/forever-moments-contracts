import { ethers } from "hardhat";
import LSP7DigitalAsset from "@lukso/lsp-smart-contracts/artifacts/LSP7DigitalAsset.json";
import { config as LoadEnv } from "dotenv";

LoadEnv();

const { PRIVATE_KEY, UP_ADDRESS, LIKES_CONTRACT_ADDRESS, MOMENT_ADDRESS, RPC_URL } = process.env;

async function main() {
  if (!UP_ADDRESS || !PRIVATE_KEY || !LIKES_CONTRACT_ADDRESS || !MOMENT_ADDRESS || !RPC_URL) {
    console.error("❌ Missing environment variables. Check your .env file!");
    return;
  }

  // ✅ Create provider and signer (UP controller)
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  console.log(`🔑 Controller Address: ${wallet.address}`);

  // ✅ Instantiate the LikesToken contract (LSP7 Digital Asset)
  const likesToken = new ethers.Contract(LIKES_CONTRACT_ADDRESS, LSP7DigitalAsset.abi, wallet);

  // ✅ Define transfer amount (e.g., 50 LIKES)
  const amountToTransfer = ethers.parseUnits("5", 18); // 50 LIKES (assuming 18 decimals)

  // ✅ Check UP's current LIKES balance
  const userBalance = await likesToken.balanceOf(UP_ADDRESS);
  console.log(`💰 UP Balance Before Transfer: ${ethers.formatUnits(userBalance, 18)} LIKES`);

  if (userBalance < amountToTransfer) {
    console.error("❌ Not enough LIKES to transfer!");
    return;
  }

  console.log(`💰 Sending ${ethers.formatUnits(amountToTransfer, 18)} LIKES from UP to ${MOMENT_ADDRESS}...`);

  try {
    // ✅ Execute Transfer from UP to Receiver
    const tx = await likesToken.transfer(
      UP_ADDRESS, // (from) sender = Universal Profile
      MOMENT_ADDRESS, // (to) recipient's address (e.g., a Moment contract)
      amountToTransfer, // (amount) LIKES to send
      true, // (force) allow transfer to any address (UP, EOA, or contract)
      "0x" // (data) optional extra data
    );

    console.log("⏳ Waiting for confirmation...");
    const receipt = await tx.wait();
    console.log(`✅ Transfer Successful! Tx Hash: ${receipt.transactionHash}`);

    // ✅ Check UP's balance after transfer
    const newUserBalance = await likesToken.balanceOf(UP_ADDRESS);
    console.log(`💰 UP Balance After Transfer: ${ethers.formatUnits(newUserBalance, 18)} LIKES`);
  } catch (error) {
    console.error("❌ Transfer Failed:", error);
  }
}

main().catch((error) => {
  console.error("❌ Error in Transfer Script:", error);
  process.exitCode = 1;
});
