import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { LikesToken__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();

// Load environment variables
const { PRIVATE_KEY, TREASURY_ADDRESS, IPFS_GATEWAY_URL, PINATA_JWT_KEY } = process.env;

async function uploadToPinata(filePath: string): Promise<string> {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY as string,
    pinataGateway: IPFS_GATEWAY_URL as string, 
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/json" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("✅ Pinata upload successful:", uploadResponse);
    return uploadResponse.IpfsHash;
  } catch (error) {
    console.error("❌ Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

const main = async () => {
  if (!PRIVATE_KEY || !TREASURY_ADDRESS || !IPFS_GATEWAY_URL || !PINATA_JWT_KEY) {
    console.error("❌ Missing environment variables. Ensure they are correctly set in .env.");
    return;
  }

  // Create provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Read metadata JSON file
  const metadataPath = "assets/LikesMetadata.json";
  const metadataJson = JSON.parse(readFileSync(metadataPath).toString());

  console.log("📡 Uploading metadata to Pinata...");
  let metadataHash: string;
  try {
    metadataHash = await uploadToPinata(metadataPath);
    console.log("✅ Metadata successfully uploaded to IPFS:", metadataHash);
  } catch (uploadError) {
    console.error("❌ Failed to upload metadata to IPFS:", uploadError);
    return;
  }

  const metadataUrl = `ipfs://${metadataHash}`;
  console.log("🔗 Metadata URL:", metadataUrl);

  // Encode metadata URI using ERC725.js
  const erc725 = new ERC725(LSP4DigitalAssetSchema);
  const encodedData = erc725.encodeData([
    {
      keyName: "LSP4Metadata",
      value: {
        json: metadataJson,
        url: metadataUrl,
      },
    },
    {
      keyName: "LSP4Creators[]",
      value: [signer.address],
    }
  ]);

  // Set initial LIKES supply for treasury
  const initialTreasuryLikes = 1_000_000; // 1M LIKES 

  // Deploy the LikesToken contract
  console.log("🚀 Deploying LikesToken...");
  const likesToken = await new LikesToken__factory(signer).deploy(
    "Likes Token",          // Token name
    "LIKES",          // Token symbol
    signer.address,   // Contract owner
    TREASURY_ADDRESS,  // Treasury wallet address
    initialTreasuryLikes,
    encodedData.values[0] // Encoded metadata including creator
  );

  // Get deployment transaction
  const deploymentTx = likesToken.deploymentTransaction();
  if (!deploymentTx) {
    console.error("❌ Deployment transaction not found.");
    return;
  }

  console.log("⏳ Waiting for deployment confirmation...");
  await deploymentTx.wait(1);

  console.log("🎉 LikesToken deployed at:", await likesToken.getAddress());
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
