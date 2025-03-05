import { ethers } from "hardhat";
import { AbiCoder, Contract, keccak256 } from 'ethers';
import { config as LoadEnv } from "dotenv";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import LSP6KeyManager from "@lukso/lsp-smart-contracts/artifacts/LSP6KeyManager.json";
import { readFileSync } from "fs";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();

const { DEPLOYED_UP_ADDRESS, DEPLOYED_LSP6_ADDRESS, PRIVATE_KEY, PINATA_JWT_KEY, IPFS_GATEWAY_URL } = process.env;

async function uploadToPinata(filePath: string): Promise<string> {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY as string,
    pinataGateway: IPFS_GATEWAY_URL as string,
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/json" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("Pinata upload successful:", uploadResponse);
    return uploadResponse.IpfsHash; // Return only the IpfsHash
    // return `ipfs://${uploadResponse.IpfsHash}`;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

function computeVerificationHash(metadataUrl: string): string {
  return keccak256(new TextEncoder().encode(metadataUrl));
}

async function updateViaKeyManager() {
  if (!DEPLOYED_UP_ADDRESS || !DEPLOYED_LSP6_ADDRESS || !PRIVATE_KEY) {
    console.error("Missing environment variables. Please ensure UP_ADDRESS, LSP6_ADDRESS, and PRIVATE_KEY are set.");
    return;
  }

  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const universalProfile = new ethers.Contract(DEPLOYED_UP_ADDRESS, UniversalProfile.abi, signer);
  const keyManager = new ethers.Contract(DEPLOYED_LSP6_ADDRESS, LSP6KeyManager.abi, signer);

  // Step 1: Upload Metadata
  const metadataPath = "assets/LSP3ProfileMetadata.json";
  const metadataHash = await uploadToPinata(metadataPath);
  const metadataUrl = `ipfs://${metadataHash}`;
  const verificationHash = computeVerificationHash(metadataUrl);
  // const metadataJson = JSON.parse(readFileSync(metadataPath, "utf-8"));

  console.log("Uploaded Metadata Hash:", metadataHash);
  console.log("Metadata URL:", metadataUrl);
  console.log("Updated Verification Hash:", verificationHash);

  // Step 2: Encode LSP3Profile Data
  const key = "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5"; // Key for LSP3Profile
  const abiCoder = new AbiCoder();
  const bytes32MetadataHash = keccak256(new TextEncoder().encode(metadataHash));
  const value = abiCoder.encode(
    ["tuple(string hashFunction, bytes32 hash, string url)"],
    [[
      "keccak256(utf8)", // hashFunction
      bytes32MetadataHash,      // hash
      metadataUrl        // url
    ]]
  );

  // Encode the `setData` call to the UP
  const payload = universalProfile.interface.encodeFunctionData("setData", [key, value]);
  console.log("Encoded Payload:", payload);

  try {
    // Use the Key Manager to execute the transaction
    const tx = await keyManager.execute(payload);
    await tx.wait();
    console.log("UP data updated successfully via Key Manager!");
  } catch (error: any) {
    console.error("Error during Key Manager execute:", error);
    // if (error?.data) {
    //   try {
    //     const decodedError = ethers.toUtf8String(error.data);
    //     console.error("Revert Reason:", decodedError);
    //   } catch (decodeError) {
    //     console.error("Failed to decode revert reason:", decodeError);
    //   }
    // } else {
    //   console.error("No revert reason found. Error:", error);
    // }
  }
}

updateViaKeyManager().catch(console.error);
