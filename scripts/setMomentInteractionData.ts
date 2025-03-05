import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { toBeHex } from "ethers";
import { MomentMetadata__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer"; 

LoadEnv();

const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, METADATA_CONTRACT_ADDRESS, PINATA_JWT_KEY, IPFS_GATEWAY_URL } = process.env;

async function uploadToPinata(filePath: string): Promise<string> {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY as string,
    pinataGateway: IPFS_GATEWAY_URL as string, 
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/json" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("Pinata upload successful:", uploadResponse);
    return `ipfs://${uploadResponse.IpfsHash}`;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

const main = async () => {
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !METADATA_CONTRACT_ADDRESS || !PINATA_JWT_KEY || !IPFS_GATEWAY_URL) {
    console.error("Missing environment variables. Please ensure UP_ADDRESS, PUBLIC_KEY, IPFS_GATEWAY_URL, PINATA_JWT_KEY, PRIVATE_KEY and COLLECTION_OWNER are set in .env.");
    return;
  }

  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const metadataContract = MomentMetadata__factory.connect(METADATA_CONTRACT_ADDRESS, signer);

  // Fetch contract owner and signer address
  const owner = await metadataContract.owner();
  console.log("Contract Owner:", owner);
  console.log("Signer Address:", signer.address);

  // Load the schema
  const schemaPath = "assets/MomentMetadataSchema.json";
  const momentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));

  // Read metadata JSON file
  const metadataPath = "assets/InteractionMetadata.json";
  const metadataJson = readFileSync(metadataPath, "utf-8");

  console.log("Uploading metadata to Pinata...");
  let metadataUrl: string;
  try {
    metadataUrl = await uploadToPinata(metadataPath);
    console.log("Metadata successfully uploaded to IPFS:", metadataUrl);
  } catch (uploadError) {
    console.error("Failed to upload metadata to IPFS:", uploadError);
    return;
  }

  // Prepare and encode metadata
  const erc725 = new ERC725(momentMetadataSchema);
  const encodedMetadataURI = erc725.encodeData([
    {
      keyName: "MomentInteractions",
      value: {
        json: JSON.parse(metadataJson),
        url: metadataUrl,
      },
    },
  ]);

  console.log("Encoded Metadata:", encodedMetadataURI);

  // Convert token ID to bytes32
  const address = METADATA_CONTRACT_ADDRESS;
  const tokenId = toBeHex(address, 32); // Pad the address to 32 bytes
  console.log("Token ID (bytes32):", tokenId);

  // Call the setMomentMetadata function on MomentMetadata contract
  const tx = await metadataContract.setInteractionMetadata(
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
