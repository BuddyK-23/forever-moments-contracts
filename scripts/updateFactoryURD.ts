import { ethers } from "hardhat";
import { config as dotenv } from "dotenv";
import UniversalProfile from "@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json";

dotenv();
const { MOMENT_FACTORY_ADDRESS, MOMENT_URD_ADDRESS, UP_ADDRESS, PRIVATE_KEY, RPC_URL } = process.env;

async function main() {
  if (!MOMENT_FACTORY_ADDRESS || !MOMENT_URD_ADDRESS || !UP_ADDRESS || !PRIVATE_KEY || !RPC_URL) {
    throw new Error("Missing environment variables");
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  
  // Connect to UP and Factory
  const universalProfile = new ethers.Contract(UP_ADDRESS, UniversalProfile.abi, wallet);
  const MomentFactory = await ethers.getContractFactory("MomentFactory");
  const factory = MomentFactory.attach(MOMENT_FACTORY_ADDRESS);

  // Get the setMomentURD function calldata
  const setURDCalldata = factory.interface.encodeFunctionData('setMomentURD', [MOMENT_URD_ADDRESS]);

  console.log("Factory Address:", MOMENT_FACTORY_ADDRESS);
  console.log("New URD Address:", MOMENT_URD_ADDRESS);
  console.log("UP Address:", UP_ADDRESS);

  console.log("Updating MomentURD address through UP...");
  const tx = await universalProfile.execute(
    0, // Operation type (CALL)
    MOMENT_FACTORY_ADDRESS,
    0, // Value in LYX
    setURDCalldata,
    { gasLimit: 500000 }
  );
  
  console.log("Transaction sent:", tx.hash);
  const receipt = await tx.wait();
  console.log("Transaction confirmed in block:", receipt.blockNumber);

  // Verify the update
  const newURD = await factory.momentURD();
  console.log("New URD address set to:", newURD);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 