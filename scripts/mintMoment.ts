import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY, PINATA_JWT_KEY, IPFS_GATEWAY_URL, DEPLOYED_UP_ADDRESS } = process.env;

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
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PUBLIC_KEY) {
    console.error("Missing environment variables. Please ensure PUBLIC_KEY, PRIVATE_KEY, UP_ADDRESS and MOMENT_FACTORY_ADDRESS are set in .env.");
    return;
  }
  
  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, signer);

  // Read Moment metadata JSON file
  const metadataPath = "assets/MomentMetadata.json";
  const metadataJson = JSON.parse(readFileSync("assets/MomentMetadata.json").toString());

  // Read LSP4 metadata JSON file
  const metadataPath_LSP4 = "assets/LSP4Metadata.json";
  const metadataJson_LSP4 = JSON.parse(readFileSync("assets/LSP4Metadata.json").toString());

  console.log("Uploading metadata to Pinata...");
  let metadataUrl: string;
  let metadataUrl_LSP4: string;
  try {
    metadataUrl = await uploadToPinata(metadataPath);
    metadataUrl_LSP4 = await uploadToPinata(metadataPath_LSP4);
    console.log("Moment Metadata successfully uploaded to IPFS:", metadataUrl);
    console.log("LSP4 Metadata successfully uploaded to IPFS:", metadataUrl_LSP4);
  } catch (uploadError) {
    console.error("Failed to upload metadata to IPFS:", uploadError);
    return;
  }

  // Initialize ERC725 instance with multiple schemas
  // Load the schema
  const schemaPath = "assets/MomentMetadataSchema.json";
  const MomentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));

  const erc725 = new ERC725([
    ...MomentMetadataSchema,
    ...LSP4DigitalAssetSchema,
  ]);
  const encodedKeysAndValues = erc725.encodeData([
    {
      keyName: "MomentMetadata",
      value: {
        json: metadataJson,
        url: metadataUrl,
      },
    },
    {
      keyName: "LSP4Metadata",
      value: {
        json: metadataJson_LSP4,
        url: metadataUrl_LSP4,
      },
    },
  ]);

  console.log("Encoded keys and values:", encodedKeysAndValues);

  // Set the recipient address
  const recipient = UP_ADDRESS;
  const collectionUP = DEPLOYED_UP_ADDRESS;

  // Call the mintMoment function
  try {
    // Add gas estimation to see if there's an error
    const gasEstimate = await momentFactory.mintMoment.estimateGas(
      recipient,
      encodedKeysAndValues.values[0],
      encodedKeysAndValues.values[1],
      collectionUP
    );
    console.log("Gas estimate:", gasEstimate);

    const tx = await momentFactory.mintMoment(
      recipient,
      encodedKeysAndValues.values[0],
      encodedKeysAndValues.values[1],
      collectionUP
    );
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait(1);
    console.log("Mint transaction confirmed!");
  } catch (error: any) {
    console.error("Detailed error:", error);
    if (error.data) {
      console.error("Contract error data:", error.data);
    }
    throw error;
  }
};

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
