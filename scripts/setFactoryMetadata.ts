import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();

const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PINATA_JWT_KEY, IPFS_GATEWAY_URL } = process.env;

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
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PINATA_JWT_KEY) {
    console.error("Missing environment variables. Please ensure PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS and PINATA_JWT_KEY are set in .env.");
    return;
  }

  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, signer);

  const owner = await momentFactory.owner();
  console.log("Contract Owner:", owner);
  console.log("Signer Address:", signer.address);

  // Read metadata JSON file
  const metadataPath = "assets/FactoryMetadata.json";
  const metadataJson = JSON.parse(readFileSync("assets/FactoryMetadata.json").toString());

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

  // Call the setFactoryDatata function
  try {
    const tx = await momentFactory.setMomentFactoryData(encodedMetadataURI.values[0]);
    console.log("Transaction sent, waiting for confirmation...");
    const receipt = await tx.wait(1);
    if (receipt) {
      console.log("Set data transaction confirmed! Transaction hash:", receipt.hash);
      console.log("Transaction Receipt:", receipt);
    } else {
      console.error("Transaction receipt is null or undefined.");
    }
  } catch (txError) {
    console.error("Failed to set metadata on the blockchain:", txError);
  }
};

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
