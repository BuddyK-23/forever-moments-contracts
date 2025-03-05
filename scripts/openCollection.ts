import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { OpenCollectionManager__factory } from "../typechain-types";

LoadEnv();
const { 
  PRIVATE_KEY, 
  RPC_URL, 
  DEPLOYED_UP_ADDRESS, 
  OPEN_COLLECTION_MANAGER_ADDRESS,
  UP_ADDRESS
} = process.env;

async function main() {
  if (!PRIVATE_KEY || !RPC_URL || !DEPLOYED_UP_ADDRESS || !OPEN_COLLECTION_MANAGER_ADDRESS || !UP_ADDRESS) {
    throw new Error("Missing environment variables");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Connect to the executing UP (not the collection UP)
  const universalProfile = new ethers.Contract(
    UP_ADDRESS,
    UniversalProfileArtifact.abi,
    signer
  );

  // Get OpenCollectionManager interface for encoding the call
  const openCollectionManager = OpenCollectionManager__factory.connect(
    OPEN_COLLECTION_MANAGER_ADDRESS,
    signer
  );

  // Encode openCollection function call
  const openCollectionPayload = openCollectionManager.interface.encodeFunctionData(
    "openCollection",
    [DEPLOYED_UP_ADDRESS]
  );

  console.log("Opening collection...");
  const tx = await universalProfile.execute(
    0, // Operation type (CALL)
    OPEN_COLLECTION_MANAGER_ADDRESS, // target (the manager contract we want to call)
    0, // Value
    openCollectionPayload,
    { gasLimit: 300000 }
  );

  console.log("⏳ Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("✅ Collection opened in block:", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 