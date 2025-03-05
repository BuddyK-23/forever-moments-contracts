import { ethers } from 'hardhat';
import { ERC725 } from '@erc725/erc725.js';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

type AllowedCall = [string, string, string, string];

LoadEnv();
const { 
  PRIVATE_KEY,           // Collection owner's private key
  PUBLIC_KEY,            
  MOMENT_FACTORY_ADDRESS,
  RPC_URL, 
  DEPLOYED_UP_ADDRESS,   // Collection UP address
  BENEFICIARY_ADDRESS,   // Address to grant permissions to
  UP_ADDRESS             // Added UP_ADDRESS to the env vars
} = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !PUBLIC_KEY || !MOMENT_FACTORY_ADDRESS || !RPC_URL || !DEPLOYED_UP_ADDRESS || !BENEFICIARY_ADDRESS || !UP_ADDRESS) {
    throw new Error("❌ Missing environment variables");
  }

  try {
    const erc725 = new ERC725(LSP6Schema, DEPLOYED_UP_ADDRESS, RPC_URL);
    console.log("📝 Granting permissions to:", BENEFICIARY_ADDRESS);

    // 1. Get & decode existing permissions
    const existingPermissions = await erc725.getData({
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
    });

    // Decode existing permissions and combine with new ones
    const decodedPermissions = existingPermissions.value 
      ? erc725.decodePermissions(existingPermissions.value as string)
      : {};
    
    const updatedPermissions = {
      ...decodedPermissions,
      CALL: true,
    };

    // 2. Get existing allowed calls
    const existingAllowedCalls = await erc725.getData({
      keyName: 'AddressPermissions:AllowedCalls:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
    });

    // Prepare allowed calls array, preserving existing ones
    const existingCalls = existingAllowedCalls.value && Array.isArray(existingAllowedCalls.value)
      ? existingAllowedCalls.value as any[]
      : [];

    // New call to add
    const mintMomentSelector = ethers.id("mintMoment(address,bytes,bytes,address)").slice(0, 10);
    const newCall = [
      "0x00000002",           // CALL permission
      MOMENT_FACTORY_ADDRESS, // contract address
      "0xffffffff",          // any interface ID
      mintMomentSelector     // mintMoment function selector
    ];

    // Only add new call if it doesn't exist
    const callExists = existingCalls.some(call => 
      call[1].toLowerCase() === MOMENT_FACTORY_ADDRESS.toLowerCase() && 
      call[3].toLowerCase() === mintMomentSelector.toLowerCase()
    );

    const updatedCalls = callExists ? existingCalls : [...existingCalls, newCall];

    // Get number of existing controllers
    const controllersData = await erc725.getData('AddressPermissions[]');
    const controllers = Array.isArray(controllersData.value) ? controllersData.value as string[] : [];
    const controllerExists = controllers.some(c => c.toLowerCase() === BENEFICIARY_ADDRESS.toLowerCase());

    // 3. Encode and set the data
    const permissionData = erc725.encodeData([
      {
        keyName: 'AddressPermissions:Permissions:<address>',
        dynamicKeyParts: BENEFICIARY_ADDRESS,
        value: erc725.encodePermissions(updatedPermissions),
      },
      {
        keyName: 'AddressPermissions:AllowedCalls:<address>',
        dynamicKeyParts: BENEFICIARY_ADDRESS,
        value: updatedCalls
      },
      // Only add to controllers array if not already present
      ...(controllerExists ? [] : [{
        keyName: 'AddressPermissions[]',
        value: [...controllers, BENEFICIARY_ADDRESS]
      }])
    ]);

    // 5. Execute the update through UP
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);
    const universalProfile = new ethers.Contract(
      UP_ADDRESS,
      UniversalProfileArtifact.abi,
      signer
    );

    // Create interface for the target contract
    const targetInterface = new ethers.Interface(UniversalProfileArtifact.abi);
    const calldata = targetInterface.encodeFunctionData("setDataBatch", [
      permissionData.keys,
      permissionData.values
    ]);

    console.log("📝 Sending transaction to update permissions...");
    const tx = await universalProfile.execute(
      0, // operation type (CALL)
      DEPLOYED_UP_ADDRESS, // target (collection UP)
      0, // value
      calldata,
      { gasLimit: 300000 }
    );

    console.log("⏳ Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Transaction confirmed in block:", receipt.blockNumber);

    // 6. Verify the updates
    await verifyPermissions(erc725, BENEFICIARY_ADDRESS, mintMomentSelector);

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
};

async function verifyPermissions(erc725: ERC725, address: string, selector: string) {
  const [permissions, allowedCalls] = await Promise.all([
    erc725.getData({
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: address,
    }),
    erc725.getData({
      keyName: 'AddressPermissions:AllowedCalls:<address>',
      dynamicKeyParts: address,
    })
  ]);

  console.log("\n📋 Verification Results:");
  if (permissions.value) {
    console.log("Permissions:", erc725.decodePermissions(permissions.value as string));
  }

  if (allowedCalls.value) {
    console.log("Allowed Calls:", allowedCalls.value);
    if (Array.isArray(allowedCalls.value)) {
      allowedCalls.value.forEach((call: unknown, index: number) => {
        const typedCall = call as AllowedCall;
        console.log(`Call ${index + 1}:`, {
          permission: typedCall[0],
          contract: typedCall[1],
          interfaceId: typedCall[2],
          selector: typedCall[3]
        });
      });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

