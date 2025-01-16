import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { toBeHex } from "ethers";
import { MomentMetadata__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";

const erc725 = new ERC725(LSP4DigitalAssetSchema);
LoadEnv();

const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, METADATA_CONTRACT_ADDRESS } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !METADATA_CONTRACT_ADDRESS) {
    console.error("Missing environment variables. Please ensure UP_ADDRESS, PUBLIC_KEY, PRIVATE_KEY and COLLECTION_OWNER are set in .env.");
    return;
  }

  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const metadataContractAddress = METADATA_CONTRACT_ADDRESS;
  const metadataContract = MomentMetadata__factory.connect(metadataContractAddress, signer);

  // Fetch contract owner and signer address
  const owner = await metadataContract.owner();
  console.log("Contract Owner:", owner);
  console.log("Signer Address:", signer.address);

  // Prepare metadata URI
  const url = "ipfs://bafkreiatafbqg6tkgfnh5alf7ouvrcuz3wj6ei4zcmayswia7wzjnydpyi/metadata.json"; // IPFS URL of metadata.json
  const json = JSON.parse(readFileSync("assets/metadata.json").toString());
  
  // Encode metadata URI
  const encodedMetadataURI = erc725.encodeData([
    {
      keyName: "LSP4Metadata",
      value: {
        json,
        url,
      },
    },
  ]);

  console.log("Encoded Metadata:", encodedMetadataURI);
  
  // Convert token ID to bytes32
  const address = METADATA_CONTRACT_ADDRESS;
  const tokenId = toBeHex(address, 32); // Pad the address to 32 bytes
  console.log("Token ID (bytes32):", tokenId);

  // Call the setMomentMetadata function on MomentMetadata contract
  const tx = await metadataContract.setMomentMetadata(
    tokenId,
    encodedMetadataURI.values[0]
  );

  console.log("Transaction sent, waiting for confirmation...");
  const receipt = await tx.wait(1);

  console.log("Set data transaction confirmed. Token metadata has been updated!");
};

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
