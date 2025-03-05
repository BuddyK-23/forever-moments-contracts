import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY, DEPLOYED_UP_ADDRESS } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PUBLIC_KEY) {
    console.error("Missing environment variables. Please ensure PUBLIC_KEY, PRIVATE_KEY, UP_ADDRESS and MOMENT_FACTORY_ADDRESS are set in .env.");
    return;
  }

  try {
    // Initialize provider and signer
    const provider = ethers.provider;
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Connect to the deployed MomentFactory contract
    const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, signer);

    // Log the details
    console.log("Storing a new collection...");
    console.log("CollectionUP:", DEPLOYED_UP_ADDRESS);
    console.log("ControllerUP:", PUBLIC_KEY);
    console.log("OwnerUP:", UP_ADDRESS);

    // Call the storeCollection function
    const tx = await momentFactory.storeCollection(DEPLOYED_UP_ADDRESS, PUBLIC_KEY, UP_ADDRESS);
    console.log("Transaction sent:", tx.hash);

    // Wait for transaction confirmation
    const receipt = await tx.wait(1);
    console.log("Transaction confirmed:", receipt.transactionHash);
    console.log("New collection successfully stored.");
  } catch (error) {
    console.error("Error during transaction:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});

