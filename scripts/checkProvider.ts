import { ethers } from "hardhat";
//import { ethers } from "ethers";
import { config as LoadEnv } from "dotenv";

LoadEnv();

const { RPC_URL } = process.env;

const main = async () => {
  const provider = ethers.provider;
  //const provider = new ethers.JsonRpcProvider(RPC_URL);

  const network = await provider.getNetwork();

  console.log(`Connected to network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
  console.log(provider);
  console.log(network);
};

main();