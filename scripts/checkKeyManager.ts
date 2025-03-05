import { ERC725 } from "@erc725/erc725.js";
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { RPC_URL, UP_ADDRESS } = process.env;

if (!RPC_URL || !UP_ADDRESS) {
  console.error("❌ Missing environment variables. Ensure RPC_URL and UP_ADDRESS are set in .env.");
  process.exit(1);
}

const main = async () => {
  try {
    console.log(`🔍 Checking Owner of Universal Profile: ${UP_ADDRESS}...`);

    // Initialize ERC725.js using the ERC725Account schema
    const erc725 = new ERC725([], UP_ADDRESS, RPC_URL);

    // Fetch the owner of the Universal Profile
    const ownerAddress = await erc725.getOwner();

    console.log(`👤 Universal Profile Owner: ${ownerAddress}`);

    // Check if the owner is a smart contract (Key Manager)
    const response = await fetch(`${RPC_URL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_getCode",
        params: [ownerAddress, "latest"],
        id: 1,
      }),
    });

    const { result } = await response.json();

    if (result !== "0x") {
      console.log(`✅ The UP is managed by a Key Manager: ${ownerAddress}`);
    } else {
      console.log(`⚠️ The UP owner is an EOA (Externally Owned Account), meaning there is NO Key Manager!`);
    }
  } catch (error) {
    console.error("❌ Error checking UP owner:", error);
  }
};

main();
