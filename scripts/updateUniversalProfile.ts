import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import { createReadStream, readFileSync } from "fs";
import { IPFSHttpClientUploader } from "@lukso/data-provider-ipfs-http-client";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";
import { ERC725 } from "@erc725/erc725.js";

LoadEnv();

const { IPFS_GATEWAY, PROFILE_ADDRESS, PUBLIC_KEY, PRIVATE_KEY } = process.env;

const main = async () => {
  try {
    if (!IPFS_GATEWAY || !PROFILE_ADDRESS || !PUBLIC_KEY || !PRIVATE_KEY) {
      console.error("Missing environment variables. Please ensure IPFS_GATEWAY, PROFILE_ADDRESS, PRIVATE_KEY and PUBLIC_KEY are set in .env.");
      return;
    }

    // Step 1: Upload image to IPFS
    const ipfsProvider = new IPFSHttpClientUploader('http://127.0.0.1:5001/api/v0/add');
    const imageFile = createReadStream("assets/meme.jpg");
    const { url: imageUrl, hash: imageHash } = await ipfsProvider.upload(imageFile);
    console.log("Image uploaded:", imageUrl, imageHash);

    // Step 2: Upload JSON metadata to IPFS
    const jsonFile = JSON.parse(readFileSync("assets/LSP3ProfileMetadata.json", "utf8"));
    const { url: metadataUrl, hash: metadataHash } = await ipfsProvider.upload(jsonFile);
    console.log("Metadata uploaded:", metadataUrl, metadataHash);

    // Step 3: Encode LSP3Profile data
    const schema = [
      {
        name: "LSP3Profile",
        key: "0x5ef83ad9559033e6e941db7d7c495acdce616347d28e90c7ce47cbfcfcad3bc5",
        keyType: "Singleton",
        valueType: "bytes",
        valueContent: "VerifiableURI",
      },
    ];

    const erc725 = new ERC725(schema, PROFILE_ADDRESS, ethers.provider, {
      ipfsGateway: IPFS_GATEWAY,
    });

    const encodedData = erc725.encodeData([
      {
        keyName: "LSP3Profile", // KeyName as per documentation
        value: {
          hashFunction: "keccak256(utf8)",
          hash: metadataHash,
          url: metadataUrl,
        },
      } as any, // Bypass TypeScript type errors
    ]);

    console.log("Encoded data:", encodedData);

    // Step 4: Update Universal Profile contract
    const signer = await ethers.provider.getSigner(PRIVATE_KEY);
    const universalProfile = new ethers.Contract(
      PROFILE_ADDRESS,
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
