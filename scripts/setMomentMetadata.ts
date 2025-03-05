import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { toBeHex } from "ethers";
import { MomentMetadata__factory } from "../typechain-types";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
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

  // Connect to the Univerdsal Profile and deployed MomentFactory contract
  const universalProfile = new ethers.Contract(UP_ADDRESS, UniversalProfile.abi, signer);
  const metadataContract = MomentMetadata__factory.connect(METADATA_CONTRACT_ADDRESS, signer);

  // Fetch contract owner and signer address
  const owner = await metadataContract.owner();
  console.log("Contract Owner:", owner);
  console.log("Signer Address:", signer.address);

  if (owner.toLowerCase() !== UP_ADDRESS.toLowerCase()) {
    console.error("❌ The Universal Profile is NOT the owner of the contract!");
    return;
  }

  // Read metadata JSON file
  const metadataPath = "assets/MomentMetadata.json";
  console.log("Uploading metadata to Pinata...");

  let metadataUrl: string;
  try {
    metadataUrl = await uploadToPinata(metadataPath);
    console.log("Metadata successfully uploaded to IPFS:", metadataUrl);
  } catch (uploadError) {
    console.error("Failed to upload metadata to IPFS:", uploadError);
    return;
  }

  // Encode metadata using ERC725
  const schemaPath = "assets/MomentMetadataSchema.json";
  const momentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));
  const erc725 = new ERC725(momentMetadataSchema);
  
  const metadataJson = readFileSync(metadataPath, "utf-8");
  const encodedMetadataURI = erc725.encodeData([
    {
      keyName: "MomentMetadata",
      value: {
        json: JSON.parse(metadataJson),
        url: metadataUrl,
      },
    },
  ]);

  console.log("Encoded Metadata:", encodedMetadataURI);

  // Convert token ID to bytes32
  const tokenId = toBeHex(METADATA_CONTRACT_ADDRESS, 32);
  console.log("Token ID (bytes32):", tokenId);

  // 🔹 Encode function call data for `setMomentMetadata`
  const calldata = metadataContract.interface.encodeFunctionData("setMomentMetadata", [
    tokenId,
    encodedMetadataURI.values[0]
  ]);

  console.log("📡 Calling Universal Profile to execute setMomentMetadata...");

  try {
    // Execute the function through Universal Profile
    const transaction = await universalProfile.execute(
      0, // 0 = CALL operation
      METADATA_CONTRACT_ADDRESS, // Target contract
      0, // Value in LYX
      calldata, // Encoded function call
      { gasLimit: 500000, from: signer.address } // Gas settings
    );

    console.log("⏳ Transaction sent, waiting for confirmation...");
    const txReceipt = await transaction.wait(1);

    console.log(`✅ Metadata successfully updated! Tx Hash: ${txReceipt.transactionHash}`);
  } catch (error) {
    console.error("❌ Transaction failed:", error);
  }
  
  // Call the setMomentMetadata function on MomentMetadata contract
  // const tx = await metadataContract.setMomentMetadata(
  //   tokenId,
  //   encodedMetadataURI.values[0]
  // );

  // console.log("Transaction sent, waiting for confirmation...");
  // const receipt = await tx.wait(1);

  // console.log("Set data transaction confirmed. Token metadata has been updated!");
};

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
