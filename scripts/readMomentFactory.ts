import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY } = process.env;

const main = async () => {
  try {
    if (!UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PUBLIC_KEY) {
      console.error("Missing environment variables. Please ensure PUBLIC_KEY, COLLECTION_OWNER and MOMENT_FACTORY_ADDRESS are set in .env.");
      return;
    }

    // Create a provider
    const provider = ethers.provider;

    // Connect to the deployed MomentFactory contract
    const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, provider);

    // Fetch total supply of tokens
    const totalSupply = await momentFactory.totalSupply();
    console.log(`Total supply of tokens: ${totalSupply}`);

    // Fetch token IDs owned by UP_ADDRESS
    const tokenIds = await momentFactory.tokenIdsOf(UP_ADDRESS);
    console.log(`Tokens owned by ${UP_ADDRESS}:`, tokenIds);

    if (tokenIds.length === 0) {
      console.log("No tokens owned by the UP_ADDRESS.");
      return;
    }

    // LSP4 Metadata Key
    const metadataKey = "0x9afb95cacc9f95858ec44aa8c3b685511002e30ae54415823f406128b85b238e"; // _LSP4_METADATA_KEY

    // Check factory-level metadata
    try {
      const factoryMetadata = await momentFactory.getData(metadataKey);
      if (factoryMetadata && factoryMetadata.length > 0) {
        console.log("Factory Metadata (URI):", ethers.utils.toUtf8String(factoryMetadata));
      } else {
        console.log("No factory metadata found.");
      }
    } catch (error) {
      console.error("Error fetching factory metadata:", error);
    }

    for (const tokenId of tokenIds) {
      try {
        // Fetch token owner for each tokenId
        const tokenOwner = await momentFactory.tokenOwnerOf(tokenId);
        console.log(`Token ID ${tokenId} is owned by: ${tokenOwner}`);

        // Fetch all operators for the tokenId
        const operators = await momentFactory.getOperatorsOf(tokenId);
        console.log(`Operators for token ID ${tokenId}:`, operators);

        try {
          const tokenMetadata = await momentFactory.getDataForTokenId(tokenId, metadataKey);
          if (tokenMetadata && tokenMetadata.length > 0) {
            console.log(`Metadata for token ID ${tokenId}:`, ethers.utils.toUtf8String(tokenMetadata));
          } else {
            console.log(`No metadata found for token ID ${tokenId}.`);
          }
        } catch (error) {
          console.error(`Error querying metadata for token ID ${tokenId}:`, error);
        }
      } catch (error) {
        console.error(`Error querying tokenOwnerOf or getOperatorsOf for token ID ${tokenId}:`, error);
      }
    }
  } catch (error) {
    console.error("Error reading data from MomentFactory:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
