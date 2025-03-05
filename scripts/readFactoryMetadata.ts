import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from '@erc725/erc725.js';
import LSP4DigitalAssetSchema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import axios from "axios";

LoadEnv();
const { MOMENT_FACTORY_ADDRESS } = process.env;

async function fetchFromIPFS(ipfsUrl: string) {
  try {
    const gatewayUrl = ipfsUrl.replace(
      "ipfs://",
      "https://api.universalprofile.cloud/ipfs/"
    );
    const response = await axios.get(gatewayUrl);
    return response.data;
  } catch (error) {
    console.error("Error fetching from IPFS:", error);
    throw error;
  }
}

const main = async () => {
  if (!MOMENT_FACTORY_ADDRESS) {
    throw new Error("MOMENT_FACTORY_ADDRESS not set in environment");
  }

  console.log("Reading metadata from factory:", MOMENT_FACTORY_ADDRESS);

  // Initialize ERC725 for the factory
  const erc725 = new ERC725(
    LSP4DigitalAssetSchema,
    MOMENT_FACTORY_ADDRESS,
    'https://rpc.testnet.lukso.network/',
    {
      ipfsGateway: 'https://api.universalprofile.cloud/ipfs/'
    }
  );

  try {
    // Get LSP4Metadata
    const metadata = await erc725.getData('LSP4Metadata');
    console.log("Raw metadata:", metadata);

    // Type assertion for the metadata value
    const metadataValue = metadata.value as { url: string };
    
    if (metadataValue?.url) {
      if (metadataValue.url.startsWith('0x')) {
        console.log("Verifiable URI found:", metadataValue.url);
      }

      const metadataContent = await fetchFromIPFS(metadataValue.url);
      console.log("Metadata content:", metadataContent);
    }
  } catch (error) {
    console.error("Error reading metadata:", error);
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
