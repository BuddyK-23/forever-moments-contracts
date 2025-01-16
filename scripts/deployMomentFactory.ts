import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";

const erc725 = new ERC725(LSP4DigitalAssetSchema);

LoadEnv();
const { PUBLIC_KEY, UP_ADDRESS, PRIVATE_KEY } = process.env;

const main = async () => {
  if (!PUBLIC_KEY || !UP_ADDRESS || !PRIVATE_KEY) {
    console.error("Missing environment variables. Ensure PUBLIC_KEY, COLLECTION_OWNER, and PRIVATE_KEY are set in .env.");
    return;
  }

  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Prepare metadata URI
  const url = "ipfs://bafkreiatafbqg6tkgfnh5alf7ouvrcuz3wj6ei4zcmayswia7wzjnydpyi/metadata.json";
  const json = JSON.parse(readFileSync("assets/metadata.json").toString());
  
  const encodedMetadataURI = erc725.encodeData([
    {
      keyName: "LSP4Metadata",
      value: {
        json,
        url,
      },
    },
  ]);

  // Deploy the MomentFactory contract
  const momentFactory = await new MomentFactory__factory(signer).deploy(
    "Forever Moments", // Factory name
    "FMF", // Factory symbol
    UP_ADDRESS, // Factory owner
    encodedMetadataURI.values[0] // Metadata URI
  );

  const deploymentTx = momentFactory.deploymentTransaction();
  if (!deploymentTx) {
    console.error("Deployment transaction not found. Please check if the deployment was successful.");
    return;
  }
  
  console.log("Waiting for deployment confirmation...");
  await deploymentTx.wait(1);


  console.log("Contract deployed to:", await momentFactory.getAddress());
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
