import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import { config as LoadEnv } from "dotenv";
LoadEnv();

const config: HardhatUserConfig = {
  networks: {
    lukso_testnet: {
      chainId: 4201,
      url: "https://rpc.testnet.lukso.network/",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    lukso_mainnet: {
      chainId: 42,
      url: "https://42.rpc.thirdweb.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      }
    },
  },

  sourcify: {
    enabled: true,
  },
};

export default config;
