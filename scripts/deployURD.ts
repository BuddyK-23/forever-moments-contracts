import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';
import { abi as UP_ABI } from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { MomentURD__factory } from '../typechain-types';

// load env vars
dotenv.config();

// Update those values in the .env file
const { UP_ADDRESS, MOMENT_ADDRESS, PRIVATE_KEY, RPC_URL } = process.env;

async function main() {

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY as string, provider);

    const urd = await new MomentURD__factory(signer).deploy({ gasLimit: 20_000_000 });
    console.log((urd.target));
}


main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });