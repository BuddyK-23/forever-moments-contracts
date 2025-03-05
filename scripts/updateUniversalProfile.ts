// import { ethers } from "hardhat";
import { ethers as hardhatEthers } from "hardhat"; // Hardhat-specific helpers
import { ethers } from "ethers"; // Standalone ethers for utilities
import { config as LoadEnv } from "dotenv";
import { readFileSync } from "fs";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import { ERC725 } from "@erc725/erc725.js";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";

LoadEnv();

const { IPFS_GATEWAY_URL, UP_ADDRESS, PUBLIC_KEY, PRIVATE_KEY, PINATA_JWT_KEY } = process.env;

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

const main = async () => {
  try {
    if (!IPFS_GATEWAY_URL || !UP_ADDRESS || !PUBLIC_KEY || !PRIVATE_KEY) {
      console.error("Missing environment variables. Please ensure IPFS_GATEWAY, PROFILE_ADDRESS, PRIVATE_KEY and PUBLIC_KEY are set in .env.");
      return;
    }
    
    const provider = hardhatEthers.provider;
    const signer = new hardhatEthers.Wallet(PRIVATE_KEY, provider);

    console.log("Signer address:", signer.address);
    console.log("Provider:", provider);

    // Step 1: Upload metadata to Pinata
    // const imagePath = "assets/profile-buddyk-barista.png";
    // console.log("Uploading image to Pinata...");
    // const imageUrl = await uploadToPinata(imagePath);
    // console.log("Image uploaded to Pinata:", imageUrl);

    const metadataPath = "assets/LSP3ProfileMetadata.json";
    const metadataHash = await uploadToPinata(metadataPath);
    console.log("Uploaded metadata hash:", metadataHash);

    const metadataUrl = `ipfs://${metadataHash}`;
    console.log("Metadata URL:", metadataUrl);

    // Step 2: Read metadata JSON
    const metadataJson = JSON.parse(readFileSync(metadataPath, "utf-8"));
    console.log("Metadata JSON:", metadataJson);

    //Step 3: Encode LSP3Profile data
    const schema = [
      {
        name: "LSP3Profile",
        key: "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5",
        keyType: "Singleton",
        valueType: "bytes",
        valueContent: "VerifiableURI",
      },
    ];

    const erc725 = new ERC725(schema, UP_ADDRESS, hardhatEthers.provider, {
      ipfsGateway: IPFS_GATEWAY_URL,
    });

    const encodedData = erc725.encodeData([
      {
        keyName: "LSP3Profile", // KeyName as per documentation
        value: {
          hashFunction: "keccak256(utf8)",
          hash: metadataHash,
          url: metadataUrl,
          json: metadataJson, // Include the JSON metadata
        },
      } as any, // Bypass TypeScript type errors
    ]);

    console.log("Encoded data:", encodedData);

    const universalProfile = new ethers.Contract(
      UP_ADDRESS,
      UniversalProfile.abi,
      signer
    );

    await universalProfile.setData(
      encodedData.keys[0],
      encodedData.values[0]
    );
    console.log("Universal Profile updated successfully!");

  } catch (error) {
    console.error("Error updating Universal Profile:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
