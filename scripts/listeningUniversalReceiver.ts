import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { abi as UP_ABI } from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import MomentMetadataABI from "../artifacts/contracts/MomentMetadata.sol/MomentMetadata.json";
import MomentURDABI from "../artifacts/contracts/MomentURD.sol/MomentURD.json";

// Load environment variables
dotenv.config();

const { UP_ADDRESS, PRIVATE_KEY, RPC_URL, MOMENT_ADDRESS, MOMENT_URD_ADDRESS } = process.env;

async function main() {
  // Setup provider and signer
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY as string, provider);

  // Connect to both contracts
  let moment = new ethers.Contract(MOMENT_ADDRESS as string, MomentMetadataABI.abi, provider);
  let momentURD = new ethers.Contract(MOMENT_URD_ADDRESS as string, MomentURDABI.abi, provider);

  console.log('🔑 EOA: ', signer.address);
  console.log('Moment address: ', MOMENT_ADDRESS);
  console.log('URD address: ', MOMENT_URD_ADDRESS);

  // Listen to Moment's UniversalReceiver events
  moment.on("UniversalReceiver", (from, value, typeId, receivedData, returnedData) => {
    console.log(`\n📡 Moment UniversalReceiver Event:`);
    console.log('From:', from);
    console.log('Value:', value.toString());
    console.log('TypeId:', typeId);
    console.log('Received data:', receivedData);
    console.log('Returned data:', returnedData);
  });

  // Listen for ReceivedTokens events
  momentURD.on("ReceivedTokens", (sender, value, typeId, data) => {
    console.log('\n📬 ReceivedTokens Event:');
    console.log('Sender:', sender);
    console.log('Value:', value.toString());
    console.log('TypeId:', typeId);
    console.log('Data:', data);
  });

  // Add listener for DecodedData events
  momentURD.on("DecodedData", (from, operator, to, amount, userData) => {
    console.log('\n🔍 Decoded LSP7 Transfer Data:');
    console.log('From:', from);
    console.log('Operator:', operator);
    console.log('To:', to);
    console.log('Amount:', ethers.formatEther(amount));
    console.log('Comment:', ethers.decodeBytes32String(userData));
    try {
      // Try to decode as UTF8 string
      console.log('Comment:', ethers.toUtf8String(userData));
    } catch (error) {
      console.log('Raw userData:', userData);
    }
  });

  // Add listener for DecodedComment events
  momentURD.on("DecodedComment", (comment) => {
    console.log('\n💬 Decoded Comment:', comment);
  });

  console.log("🎧 Listening for events...");

  // Event signature for UniversalReceiver(bytes32, bytes)
  // const universalReceiverTopic = ethers.id("UniversalReceiver(bytes32,bytes)");

  //   console.log("🔍 Listening for UniversalReceiver events...");

  //   provider.on("block", async (blockNumber) => {
  //     console.log(`📡 New block: ${blockNumber}`);

  //       try {
  //           const logs = await provider.getLogs({
  //               address: MOMENT_ADDRESS,
  //               fromBlock: blockNumber - 10, // Look back 10 blocks for safety
  //               toBlock: "latest",
  //               topics: [universalReceiverTopic],
  //           });

  //           for (const log of logs) {
  //               const parsedLog = moment.interface.parseLog(log);
  //               console.log(`📬 UniversalReceiver Event:`, parsedLog);
  //           }
  //       } catch (error) {
  //           console.error("❌ Error fetching events:", error);
  //       }
  //   });

  // Keep the script running
  process.stdin.resume();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
