// import { ethers } from "hardhat";
import { readFileSync } from "fs";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";
// import fetch from "isomorphic-fetch"; // Required for fetchData to work
import { JsonRpcProvider } from "@ethersproject/providers"; // Correct import for JsonRpcProvider

LoadEnv();

const { METADATA_CONTRACT_ADDRESS, RPC_URL } = process.env;

// type MetadataValue = {
//   url?: string;
//   verification?: {
//     method?: string;
//     data?: string;
//   };
// };

// type Metadata = {
//   key: string;
//   value: MetadataValue | string | string[] | Record<string, any>;
// };

const main = async () => {
  try {
    // console.log("Initializing ERC725 instance...");
    // const provider = new ethers.JsonRpcProvider(RPC_URL);
    // console.log("Connecting to:", RPC_URL);

    // Load the schema
    const schemaPath = "assets/MomentMetadataSchema.json";
    const momentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));

    // Initialize ERC725js LSP4Metadata instance
    // const erc725js = new ERC725(
    //   LSP4DigitalAssetSchema, 
    //   METADATA_CONTRACT_ADDRESS, 
    //   'https://4201.rpc.thirdweb.com', 
    //   {  
    //     ipfsGateway: 'https://api.universalprofile.cloud/ipfs', 
    //   },
    // );

    // Initialize ERC725 MomentMetadata instance
    const erc725 = new ERC725(
      momentMetadataSchema, 
      METADATA_CONTRACT_ADDRESS, 
      'https://4201.rpc.thirdweb.com', 
      {  
        ipfsGateway: 'https://api.universalprofile.cloud/ipfs', 
      },
    );

    console.log("Fetching metadata...");
    //const metadata = await erc725js.fetchData("LSP4Metadata");
    const metadata = await erc725.fetchData("MomentMetadata");

    console.log("Decoded Metadata:", metadata);
    console.log(JSON.stringify(metadata, undefined, 2));

    // if (typeof metadata.value === "object" && metadata.value !== null) {
    //   const { url, verification } = metadata.value as MetadataValue;

    //   if (url) {
    //     console.log(`Metadata URL: ${url}`);
    //   } else {
    //     console.log("No URL found in metadata.");
    //   }

    //   if (verification) {
    //     console.log(`Verification Method: ${verification.method}`);
    //     console.log(`Verification Data: ${verification.data}`);
    //   } else {
    //     console.log("No verification data found in metadata.");
    //   }
    // } else {
    //   console.log("Metadata value is not an object:", metadata.value);
    // }
  } catch (error) {
    console.error("Error fetching or decoding metadata:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
