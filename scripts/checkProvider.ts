import { ethers } from "hardhat";

const main = async () => {
  const provider = ethers.provider;
  const network = await provider.getNetwork();

  console.log(`Connected to network: ${network.name}`);
  console.log(`Chain ID: ${network.chainId}`);
};

main();