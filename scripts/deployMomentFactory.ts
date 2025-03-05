import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();
const { PUBLIC_KEY, UP_ADDRESS, PRIVATE_KEY, IPFS_GATEWAY_URL, PINATA_JWT_KEY, MOMENT_URD_ADDRESS } = process.env;

async function uploadToPinata(filePath: string): Promise<string> {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY as string,
    pinataGateway: IPFS_GATEWAY_URL as string, 
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/json" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("Pinata upload successful:", uploadResponse);
    return uploadResponse.IpfsHash;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

async function createVerifiableURI(json: any, ipfsHash: string): Promise<string> {
  // Create verifiable URI components
  const verifiableUriIdentifier = '0x0000';
  const verificationMethod = ethers.keccak256(ethers.toUtf8Bytes('keccak256(utf8)')).substring(0, 10);
  const verificationData = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(json)));
  const verificationDataLength = ethers.zeroPadValue(ethers.toBeHex(32), 2); // 32 bytes length
  const url = ethers.hexlify(ethers.toUtf8Bytes(`ipfs://${ipfsHash}`));

  // Combine all components
  return verifiableUriIdentifier +
         verificationMethod.substring(2) + // remove 0x
         verificationDataLength.substring(2) +
         verificationData.substring(2) +
         url.substring(2);
}

const main = async () => {
  if (!PUBLIC_KEY || !UP_ADDRESS || !PRIVATE_KEY || !IPFS_GATEWAY_URL || !PINATA_JWT_KEY || !MOMENT_URD_ADDRESS) {
    console.error("Missing environment variables. Ensure they are correctly set in .env.");
    return;
  }

  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Read metadata JSON file
  const metadataPath = "assets/FactoryMetadata.json";
  const metadataJson = JSON.parse(readFileSync("assets/FactoryMetadata.json").toString());
  
  console.log("Uploading metadata to Pinata...");
  let metadataHash: string;
  try {
    metadataHash = await uploadToPinata(metadataPath);
    console.log("Metadata successfully uploaded to IPFS:", metadataHash);
  } catch (uploadError) {
    console.error("Failed to upload metadata to IPFS:", uploadError);
    return;
  }
  
  const metadataUrl = `ipfs://${metadataHash}`;
  console.log("Metadata URL:", metadataUrl);

  // Create verifiable URI
  const verifiableURI = await createVerifiableURI(metadataJson, metadataHash);
  console.log("Verifiable URI:", verifiableURI);

  // Encode metadata URI with verifiable URI
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

  // Deploy the MomentFactory contract with URD address
  const momentFactory = await new MomentFactory__factory(signer).deploy(
    "MBEST",                // Factory name
    "MBEST",                   // Factory symbol
    UP_ADDRESS,               // Factory owner
    encodedMetadataURI.values[0], // Metadata URI
    MOMENT_URD_ADDRESS        // URD address
  );

  const deploymentTx = momentFactory.deploymentTransaction();
  if (!deploymentTx) {
    console.error("Deployment transaction not found. Please check if the deployment was successful.");
    return;
  }
  
  console.log("Waiting for deployment confirmation...");
  await deploymentTx.wait(1);


  console.log("Contract deployed to:", await momentFactory.getAddress());
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
