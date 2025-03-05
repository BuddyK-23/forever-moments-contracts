import { readFileSync } from "fs";
import { ERC725 } from '@erc725/erc725.js';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import LSP4DigitalAssetSchema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import LSP1UniversalReceiverSchema from '@erc725/erc725.js/schemas/LSP1UniversalReceiverDelegate.json';

const main = async () => {
  try {
    // Set Universal Profile address
    const CONTRACT_ADDRESS = '0xe172c8450c85916cce0de9100f4e89ccdbca6529';
    //const COLLECTION_UP = '0x83B5cCA5Df203016D8FEA6F6B7E2BB300143a439';
    
    // Load the Moments schema
    const schemaPath = "assets/MomentMetadataSchema.json";
    const MomentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));

    // Load the Collection schema
    const collectionSchemaPath = "assets/CollectionMomentsSchema.json";
    const CollectionMomentsSchema = JSON.parse(readFileSync(collectionSchemaPath, "utf8"));

    // Initatiate erc725.js
    const erc725js = new ERC725(
      [
        ...MomentMetadataSchema,
        ...CollectionMomentsSchema,
        ...LSP3ProfileSchema,
        ...LSP4DigitalAssetSchema,
        ...LSP1UniversalReceiverSchema,
      ],
      CONTRACT_ADDRESS,
      'https://rpc.testnet.lukso.network/',
      {
        ipfsGateway: 'https://api.universalprofile.cloud/ipfs',
      },
    );

    // Get all data keys from the Universal Profile
    const profileDataKeys = await erc725js.getData();
    console.log("Data Keys:", CONTRACT_ADDRESS, profileDataKeys);

    // Add specific check for LSP7 typeId mapping
    const LSP7_TYPE_ID = '0x20804611b3e2ea21c480dc465142210acf4a2485947541770ec1fb87dee4a55c';
    const lsp7MappingKey = await erc725js.getData({
      keyName: "LSP1UniversalReceiverDelegate:<bytes32>",
      dynamicKeyParts: LSP7_TYPE_ID
    });
    
    console.log("\nLSP7 URD Mapping:", lsp7MappingKey);
  } catch (error) {
    console.error("Error fetching data keys:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
