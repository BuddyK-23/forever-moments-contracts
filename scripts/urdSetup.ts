import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { abi as UP_ABI } from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import MomentMetadataABI from "../artifacts/contracts/MomentMetadata.sol/MomentMetadata.json";

// load env vars
dotenv.config();

// Update those values in the .env file
const { UP_ADDRESS, PRIVATE_KEY, RPC_URL, MOMENT_ADDRESS } = process.env;

async function main() {

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY as string, provider);

  // let UP = new ethers.Contract(UP_ADDRESS as string, UP_ABI, provider);
  let moment = new ethers.Contract(MOMENT_ADDRESS as string, MomentMetadataABI.abi, provider);

  console.log('🔑 EOA: ', signer.address);
  // console.log('🆙 Universal Profile: ', await UP.getAddress());
  console.log('Moment owner: ', await moment.owner());

  const typeId = ethers.id("Royalty");
  const data = "0xaabbccdd"
  // const tx = await UP.connect(signer).universalReceiver(typeId, data, { value: 10 });
  const tx = await moment.connect(signer).universalReceiver(typeId, data, { value: 10 });
  await tx.wait();
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });