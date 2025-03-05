import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { toBeHex } from "ethers";
import { MomentMetadata__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, PINATA_JWT_KEY, IPFS_GATEWAY_URL, MOMENT_ADDRESS } = process.env;

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
  if (!PRIVATE_KEY || !UP_ADDRESS || !PINATA_JWT_KEY || !IPFS_GATEWAY_URL || !MOMENT_ADDRESS) {
    console.error("Missing environment variables. Please ensure UP_ADDRESS, PUBLIC_KEY, IPFS_GATEWAY_URL, PINATA_JWT_KEY, PRIVATE_KEY and COLLECTION_OWNER are set in .env.");
    return;
  }

  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const metadataContract = MomentMetadata__factory.connect(MOMENT_ADDRESS, signer);

  // Read metadata JSON file
    const metadataPath = "assets/TestMomentMetadata.json";
    const metadataJson = JSON.parse(readFileSync("assets/TestMomentMetadata.json").toString());
    
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
  const erc725 = new ERC725(LSP4DigitalAssetSchema);
  const encodedMetadataURI = erc725.encodeData([
    {
      keyName: "LSP4Metadata",
      value: {
        json: metadataJson,
        url: metadataUrl,
      },
    },
  ]);

  console.log("Encoded Metadata:", encodedMetadataURI);

  // Convert token ID to bytes32
  const address = MOMENT_ADDRESS;
  const tokenId = toBeHex(address, 32); // Pad the address to 32 bytes
  console.log("Token ID (bytes32):", tokenId);

  // Call the setMomentMetadata function on MomentMetadata contract
  const tx = await metadataContract.setLSP4Metadata(
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
