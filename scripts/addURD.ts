import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { abi as UP_ABI } from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { ERC725YDataKeys, LSP1_TYPE_IDS } from '@lukso/lsp-smart-contracts';
import MomentMetadataABI from "../artifacts/contracts/MomentMetadata.sol/MomentMetadata.json";
import { abi as ERC725Y_ABI } from '@lukso/lsp-smart-contracts/artifacts/LSP0ERC725Account.json';

// load env vars
dotenv.config();

// Update those values in the .env file
const { UP_ADDRESS, PRIVATE_KEY, MOMENT_ADDRESS, RPC_URL, MOMENT_URD_ADDRESS } = process.env;

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY as string, provider);

  // Initialize contracts
  const universalProfile = new ethers.Contract(UP_ADDRESS as string, UP_ABI, signer);
  let moment = new ethers.Contract(MOMENT_ADDRESS as string, [...MomentMetadataABI.abi, ...ERC725Y_ABI], provider);

  console.log('🔑 EOA: ', signer.address);
  console.log('🆙 Universal Profile: ', UP_ADDRESS);
  console.log('Moment owner: ', await moment.owner());

  // Verify the UP is the owner
  const owner = await moment.owner();
  if (owner.toLowerCase() !== UP_ADDRESS?.toLowerCase()) {
    throw new Error(`UP ${UP_ADDRESS} is not the owner ${owner}`);
  }

  const typeIdLSP7Recipient = LSP1_TYPE_IDS.LSP7Tokens_RecipientNotification;
  const constructedDataKey = ERC725YDataKeys.LSP1.LSP1UniversalReceiverDelegatePrefix + typeIdLSP7Recipient.substring(2, 42);

  console.log('Setting URD address:', MOMENT_URD_ADDRESS);
  console.log('For key:', constructedDataKey);

  // Encode the setData call
  const calldata = moment.interface.encodeFunctionData('setData', [
    constructedDataKey,
    ethers.zeroPadValue(MOMENT_URD_ADDRESS as string, 32)
  ]);

  console.log("📡 Calling Universal Profile to execute setData...");

  try {
    // Execute the function through Universal Profile
    const transaction = await universalProfile.execute(
      0, // 0 = CALL operation
      MOMENT_ADDRESS, // Target contract
      0, // Value in LYX
      calldata, // Encoded function call
      { gasLimit: 500000, from: signer.address } // Gas settings
    );

    console.log("⏳ Transaction sent, waiting for confirmation...");
    const txReceipt = await transaction.wait(1);
    console.log(`✅ URD successfully set! Tx Hash: ${txReceipt.transactionHash}`);

    // Verify the data was set
    const setData = await moment.getData(constructedDataKey);
    console.log('Verified set data:', setData);
  } catch (error) {
    console.error("❌ Transaction failed:", error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });