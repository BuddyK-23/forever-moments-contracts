import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import fetch from "isomorphic-fetch"; // Required for fetchData to work
import { JsonRpcProvider } from "@ethersproject/providers"; // Correct import for JsonRpcProvider


LoadEnv();

const { METADATA_CONTRACT_ADDRESS, RPC_URL } = process.env;

const main = async () => {
  if (!METADATA_CONTRACT_ADDRESS || !RPC_URL) {
    console.error("Check METADATA_CONTRACT_ADDRESS and RPC_URL in .env file.");
    return;
  }

  try {
    console.log("Initializing ERC725 instance...");

     // Use a real LUKSO RPC provider
    const provider = new JsonRpcProvider(RPC_URL);

    // Initialize ERC725 instance
    const erc725 = new ERC725(LSP4DigitalAssetSchema, METADATA_CONTRACT_ADDRESS, provider, { fetch });

    console.log("Fetching metadata...");
    const metadata = await erc725.fetchData("LSP4Metadata");

    console.log("Decoded Metadata:", metadata);

    if (metadata?.value?.url) {
      console.log(`Metadata URL: ${metadata.value.url}`);
      if (metadata.value.verification) {
        console.log(`Verification Method: ${metadata.value.verification.method}`);
        console.log(`Verification Data: ${metadata.value.verification.data}`);
      }
    } else {
      console.log("No URL or verification data found in metadata.");
    }
  } catch (error) {
    console.error("Error fetching or decoding metadata:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
