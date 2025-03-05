import { readFileSync } from "fs";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";
import { config as LoadEnv } from "dotenv";

LoadEnv();

const { PINATA_JWT_KEY, IPFS_GATEWAY_URL } = process.env;

async function uploadToPinata(filePath: string): Promise<string> {
  if (!PINATA_JWT_KEY || !IPFS_GATEWAY_URL) {
    throw new Error("Missing PINATA_JWT_KEY or IPFS_GATEWAY_URL in .env file.");
  }

  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY,
    pinataGateway: IPFS_GATEWAY_URL,
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/octet-stream" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("File uploaded to IPFS successfully:", uploadResponse);
    return `ipfs://${uploadResponse.IpfsHash}`;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

const main = async () => {
  const filePath = "./assets/likesTokenBackground.jpg"; // Change this to your file path
  try {
    console.log("Uploading file to IPFS...");
    const ipfsUrl = await uploadToPinata(filePath);
    console.log("IPFS URL:", ipfsUrl);
  } catch (error) {
    console.error("Error:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
