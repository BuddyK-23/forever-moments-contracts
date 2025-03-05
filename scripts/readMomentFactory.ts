import axios from "axios";
import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from '@erc725/erc725.js';
import LSP4DigitalAssetSchema from '@erc725/erc725.js/schemas/LSP4DigitalAsset.json';
import LSP3ProfileSchema from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';


LoadEnv();
const { UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY, DEPLOYED_UP_ADDRESS } = process.env;

// Function to fetch JSON from IPFS
const fetchIPFSJson = async (ipfsUrl: string) => {
  try {
    // Replace "ipfs://" with your IPFS gateway URL
    const ipfsGatewayUrl = ipfsUrl.replace(
      "ipfs://",
      "https://api.universalprofile.cloud/ipfs/"
    );

    console.log(`Fetching JSON from: ${ipfsGatewayUrl}`);

    // Fetch the JSON data
    const response = await axios.get(ipfsGatewayUrl);
    console.log(`Fetched IPFS JSON:`, response.data);

    return response.data; // Return the JSON data
  } catch (error) {
    console.error(`Error fetching IPFS data from ${ipfsUrl}:`, error);
    return null;
  }
};

const fetchMomentMetadata = async (
  momentIds: string[],
  momentMetadataSchema: any
) => {
  for (const momentId of momentIds) {
    console.log(`Fetching metadata for moment: ${momentId}`);

    // Convert bytes32 token ID to address (last 20 bytes)
    const momentAddress = ethers.getAddress(`0x${momentId.slice(26)}`);

    // Initialize ERC725.js for the moment
    const erc725js = new ERC725(
      [...momentMetadataSchema, ...LSP4DigitalAssetSchema],
      momentAddress, // Moment address derived from tokenId
      "https://rpc.testnet.lukso.network/",
      {
        ipfsGateway: "https://api.universalprofile.cloud/ipfs",
      }
    );

    try {
      // Fetch metadata for the moment
      const metadata = await erc725js.getData();
      console.log(`Metadata for moment ${momentId}:`, metadata);

      // Find the IPFS URL in the metadata 
      const ipfsUrl = metadata.find(
        (data) => data.name === "MomentMetadata"
      )?.value?.url;

      if (ipfsUrl) {
        console.log(`Found IPFS URL: ${ipfsUrl}`);

        // Fetch JSON from IPFS
        const ipfsJson = await fetchIPFSJson(ipfsUrl);

        // Do something with the fetched JSON
        console.log(`Fetched IPFS JSON Data:`, ipfsJson);
      } else {
        console.log("No IPFS URL found in metadata.");
      }


    } catch (error) {
      console.error(`Error fetching metadata for moment ${momentId}:`, error);
    }
  }
};

const getCollectionsByOwner = async (momentFactory: any, ownerAddress: string) => {
  try {
    console.log(`\n📋 Fetching collections owned by: ${ownerAddress}`);
    const collections = await momentFactory.getCollectionsByOwner(ownerAddress);
    
    if (collections.length === 0) {
      console.log(`No collections found for owner: ${ownerAddress}`);
      return [];
    }
    
    console.log(`Found ${collections.length} collections for owner ${ownerAddress}:`);
    collections.forEach((collection: string, index: number) => {
      console.log(`Collection ${index + 1}: ${collection}`);
    });
    
    return collections;
  } catch (error) {
    console.error(`Error fetching collections for owner ${ownerAddress}:`, error);
    return [];
  }
};

const main = async () => {
  try {
    if (!UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PUBLIC_KEY) {
      console.error("Missing environment variables. Please ensure PUBLIC_KEY, COLLECTION_OWNER and MOMENT_FACTORY_ADDRESS are set in .env.");
      return;
    }

    // Create a provider
    const provider = ethers.provider;

    // Connect to the deployed MomentFactory contract
    const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, provider);

    // Load the Moments schema
    const schemaPath = "assets/MomentMetadataSchema.json";
    const MomentMetadataSchema = JSON.parse(readFileSync(schemaPath, "utf8"));

    // -------- 1. Fetch Metadata for Moments in a Specific Collection --------
    // try {
    //   console.log(`Fetching moments for collection: ${DEPLOYED_UP_ADDRESS}`);

    //   const momentsInCollection = await momentFactory.getMomentsInCollection(
    //     DEPLOYED_UP_ADDRESS
    //   );

    //   if (momentsInCollection.length === 0) {
    //     console.log(
    //       `No moments found in the collection: ${DEPLOYED_UP_ADDRESS}`
    //     );
    //   } else {
    //     console.log(
    //       `Moments in collection ${DEPLOYED_UP_ADDRESS}:`,
    //       momentsInCollection
    //     );

    //     await fetchMomentMetadata(momentsInCollection, MomentMetadataSchema);
    //   }
    // } catch (error) {
    //   console.error(
    //     `Error fetching moments for collection ${DEPLOYED_UP_ADDRESS}:`,
    //     error
    //   );
    // }

    // -------- Fetch Metadata for All Moments Owned by the Address --------
    // console.log(`Fetching moments owned by: ${UP_ADDRESS}`);

    // const tokenIdsOwned = await momentFactory.tokenIdsOf(UP_ADDRESS);
    // console.log(`Tokens owned by ${UP_ADDRESS}:`, tokenIdsOwned);

    // if (tokenIdsOwned.length === 0) {
    //   console.log(`No moments owned by ${UP_ADDRESS}.`);
    // } else {
    //   await fetchMomentMetadata(tokenIdsOwned, MomentMetadataSchema);
    // }
    // console.log("Completed fetching all moment metadata.");
    
    // Load the Collection schema
    const collectionSchemaPath = "assets/CollectionMomentsSchema.json";
    const CollectionMomentsSchema = JSON.parse(readFileSync(collectionSchemaPath, "utf8"));

    // Fetch total supply of tokens
    const totalSupply = await momentFactory.totalSupply();
    console.log(`Total Moments minted: ${totalSupply}`);

    // Fetch token IDs owned by UP_ADDRESS
    const tokenIds = await momentFactory.tokenIdsOf(UP_ADDRESS);
    console.log(`Tokens owned by ${UP_ADDRESS}:`, tokenIds);

    if (tokenIds.length === 0) {
      console.log("No Moments owned by UP_ADDRESS.");
      return;
    }

    // Fetch total number of collections
    const totalCollections = await momentFactory.getTotalCollections();
    console.log(`Total collections: ${totalCollections}`);

    // Fetch all collection IDs
    const collectionIds = await momentFactory.getAllCollections();
    console.log(`All collections:`, collectionIds);

    // Loop through each collection and fetch its metadata
    // for (const collectionAddress of collectionIds) {
    //   console.log(`Fetching metadata for collection: ${collectionAddress}`);

    //   // Initialize ERC725.js for the current collection
    //   const erc725js = new ERC725(
    //     [...CollectionMomentsSchema, ...LSP3ProfileSchema, ...LSP4DigitalAssetSchema],
    //     collectionAddress, // Current collection address
    //     'https://rpc.testnet.lukso.network/',
    //     {
    //       ipfsGateway: 'https://api.universalprofile.cloud/ipfs',
    //     },
    //   );

    //   try {
    //     // Fetch metadata for the collection
    //     const metadata = await erc725js.getData();
    //     console.log(`Metadata for collection ${collectionAddress}:`, metadata);

  
    //     // Find the IPFS URL in the metadata 
    //     const ipfsUrl = metadata.find(
    //       (data) => data.name === "LSP3Profile"
    //     )?.value?.url;

    //     if (ipfsUrl) {
    //       console.log(`Found IPFS URL: ${ipfsUrl}`);

    //       // Fetch JSON from IPFS
    //       const ipfsJson = await fetchIPFSJson(ipfsUrl);

    //       // Do something with the fetched JSON
    //       console.log(`Fetched IPFS JSON Data:`, ipfsJson);
    //     } else {
    //       console.log("No IPFS URL found in metadata.");
    //     }
    //   } catch (error) {
    //     console.error(`Error fetching metadata for collection ${collectionAddress}:`, error);
    //   }
    // }

    try {
      const moments = await momentFactory.getMomentsInCollection(DEPLOYED_UP_ADDRESS);
      if (moments.length === 0) {
        console.log(`No moments found for collection: ${DEPLOYED_UP_ADDRESS}`);
      } else {
        console.log(`Moments in collection ${DEPLOYED_UP_ADDRESS}:`, moments);
      }
    } catch (error) {
      console.error(`Error fetching moments for collection ${DEPLOYED_UP_ADDRESS}:`, error);
    }

    // Fetch collections owned by UP_ADDRESS
    const ownedCollections = await getCollectionsByOwner(momentFactory, UP_ADDRESS);
    console.log(`Collections owned by ${UP_ADDRESS}:`, ownedCollections);
    
    //If you want to fetch collections for another address too:
    const otherAddress = "0x77B310FCcCd587Bf0582136b98694550Ee322E0F";
    const otherAddressCollections = await getCollectionsByOwner(momentFactory, otherAddress);
    console.log(`Collections owned by ${otherAddress}:`, otherAddressCollections);
    
  } catch (error) {
    console.error("Error reading data from MomentFactory:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
