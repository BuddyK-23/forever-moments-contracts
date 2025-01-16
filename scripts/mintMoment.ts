import { readFileSync } from "fs";
import { ethers } from "hardhat";
import { MomentFactory__factory } from "../typechain-types";
import { config as LoadEnv } from "dotenv";
import { ERC725 } from "@erc725/erc725.js";
import LSP4DigitalAssetSchema from "@erc725/erc725.js/schemas/LSP4DigitalAsset.json";

const erc725 = new ERC725(LSP4DigitalAssetSchema);

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !UP_ADDRESS || !MOMENT_FACTORY_ADDRESS || !PUBLIC_KEY) {
    console.error("Missing environment variables. Please ensure PUBLIC_KEY, PRIVATE_KEY, UP_ADDRESS and MOMENT_FACTORY_ADDRESS are set in .env.");
    return;
  }
  
  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Connect to the deployed MomentFactory contract
  const factoryAddress = MOMENT_FACTORY_ADDRESS;
  const momentFactory = MomentFactory__factory.connect(factoryAddress, signer);

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

  console.log("Encoded metadata URI:", encodedMetadataURI.values[0]);

  // Set the recipient address
  const recipient = UP_ADDRESS;

  // Call the mintMoment function
  const tx = await momentFactory.mintMoment(
    recipient,
    encodedMetadataURI.values[0]
  );

  console.log("Transaction sent, waiting for confirmation...");
  const receipt = await tx.wait(1);

  console.log("Mint transaction confirmed!");
};

main().catch((error) => {
  console.error("Error:", error);
  process.exitCode = 1;
});
