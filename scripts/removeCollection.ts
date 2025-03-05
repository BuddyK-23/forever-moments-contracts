import { ethers } from 'hardhat';
import { config as LoadEnv } from "dotenv";
import MomentFactoryArtifact from '../artifacts/contracts/MomentFactory.sol/MomentFactory.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';

LoadEnv();
const { 
  PRIVATE_KEY, 
  RPC_URL, 
  MOMENT_FACTORY_ADDRESS,
  REMOVE_UP_ADDRESS,  // Collection UP to remove
  UP_ADDRESS         // Our UP that owns the factory
} = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !RPC_URL || !MOMENT_FACTORY_ADDRESS || !REMOVE_UP_ADDRESS || !UP_ADDRESS) {
    console.error("❌ Missing environment variables");
    return;
  }

  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Create contract instances
    const momentFactory = new ethers.Contract(
      MOMENT_FACTORY_ADDRESS,
      MomentFactoryArtifact.abi,
      signer
    );

    const universalProfile = new ethers.Contract(
      UP_ADDRESS,
      UniversalProfileArtifact.abi,
      signer
    );

    // Get collection owner before removal
    const collectionOwner = await momentFactory.getCollectionOwner(REMOVE_UP_ADDRESS);
    console.log("📝 Collection owner:", collectionOwner);

    // Encode the removeCollection function call
    const removeCollectionPayload = momentFactory.interface.encodeFunctionData(
      "removeCollection",
      [REMOVE_UP_ADDRESS]
    );

    // Execute through UP
    console.log("🗑️ Removing collection:", REMOVE_UP_ADDRESS);
    const tx = await universalProfile.execute(
      0,                      // operation type (CALL)
      MOMENT_FACTORY_ADDRESS, // target
      0,                      // value
      removeCollectionPayload,// data
      { gasLimit: 300000 }
    );

    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();
    console.log("✅ Collection removed successfully!");

    // Verify removal
    const isStillOwned = await momentFactory.isCollectionOwnedBy(REMOVE_UP_ADDRESS, collectionOwner);
    console.log("Collection still exists:", isStillOwned);

  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 