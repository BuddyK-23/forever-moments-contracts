import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, MOMENT_FACTORY_ADDRESS, UP_ADDRESS, DEPLOYED_UP_ADDRESS, PUBLIC_KEY } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !MOMENT_FACTORY_ADDRESS || !UP_ADDRESS || !DEPLOYED_UP_ADDRESS) {
    console.error("Missing environment variables. Please ensure PRIVATE_KEY, MOMENT_FACTORY_ADDRESS, UP_ADDRESS, and DEPLOYED_UP_ADDRESS are set in .env.");
    return;
  }

  try {
    // Initialize provider and signer
    const provider = ethers.provider;
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Connect to the deployed MomentFactory contract
    const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, signer);

    // Call `getCollectionOwner` for a specific collection
    const collectionOwner = await momentFactory.getCollectionOwner(DEPLOYED_UP_ADDRESS);
    console.log(`Collection Owner of ${DEPLOYED_UP_ADDRESS}: ${collectionOwner}`);

    // Call `getCollectionsByOwner` for the ownerUP
    const ownerCollections = await momentFactory.getCollectionsByOwner(UP_ADDRESS);
    console.log(`Collections owned by ${UP_ADDRESS}:`, ownerCollections);

    // Check if the collection is owned by the ownerUP
    const isOwned = await momentFactory.isCollectionOwnedBy(DEPLOYED_UP_ADDRESS, UP_ADDRESS);
    console.log(`Is collection ${DEPLOYED_UP_ADDRESS} owned by ${PUBLIC_KEY}?: ${isOwned}`);

    // Call `getMomentsInCollection` for the collectionUP
    const momentsInCollection = await momentFactory.getMomentsInCollection(DEPLOYED_UP_ADDRESS);
    console.log(`Moments in collection ${DEPLOYED_UP_ADDRESS}:`, momentsInCollection);

    // Get the total number of collections owned by an owner
    const totalCollectionsByOwner = await momentFactory.getCollectionCountByOwner(UP_ADDRESS);
    console.log(`Total collections owned by ${UP_ADDRESS}: ${totalCollectionsByOwner}`);

    // Get the total number of moments in a collection
    const totalMomentsInCollection = await momentFactory.getMomentCountInCollection(DEPLOYED_UP_ADDRESS);
    console.log(`Total moments in collection ${DEPLOYED_UP_ADDRESS}: ${totalMomentsInCollection}`);
  } catch (error) {
    console.error("Error calling view functions:", error);
  }
};

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
