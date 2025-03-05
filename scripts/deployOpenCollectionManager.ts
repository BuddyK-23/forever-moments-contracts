import { ethers } from "hardhat";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { MOMENT_FACTORY_ADDRESS } = process.env;

async function main() {
  if (!MOMENT_FACTORY_ADDRESS) {
    throw new Error("Missing MOMENT_FACTORY_ADDRESS environment variable");
  }

  console.log("Deploying OpenCollectionManager...");
  const OpenCollectionManager = await ethers.getContractFactory("OpenCollectionManager");
  const openCollectionManager = await OpenCollectionManager.deploy(MOMENT_FACTORY_ADDRESS);
  await openCollectionManager.waitForDeployment();

  const address = await openCollectionManager.getAddress();
  console.log(`OpenCollectionManager deployed to: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 