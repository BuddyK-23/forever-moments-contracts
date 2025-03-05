import { ethers } from 'hardhat';
import { ERC725 } from '@erc725/erc725.js';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { 
  PRIVATE_KEY, 
  RPC_URL, 
  DEPLOYED_UP_ADDRESS,   // Collection UP address
  OPEN_COLLECTION_MANAGER_ADDRESS,
  UP_ADDRESS 
} = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !RPC_URL || !DEPLOYED_UP_ADDRESS || !OPEN_COLLECTION_MANAGER_ADDRESS || !UP_ADDRESS) {
    throw new Error("❌ Missing environment variables");
  }

  try {
    const erc725 = new ERC725(LSP6Schema, DEPLOYED_UP_ADDRESS, RPC_URL);
    console.log("📝 Granting permissions to:", OPEN_COLLECTION_MANAGER_ADDRESS);

    // 1. Get & decode existing permissions
    const existingPermissions = await erc725.getData({
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: OPEN_COLLECTION_MANAGER_ADDRESS,
    });

    // Decode existing permissions and combine with new ones
    const decodedPermissions = existingPermissions.value 
      ? erc725.decodePermissions(existingPermissions.value as string)
      : {};
    
    const updatedPermissions = {
      ...decodedPermissions,
      ADDCONTROLLER: true,
      EDITPERMISSIONS: true,
      SETDATA: true,
    };

    // Get number of existing controllers
    const controllersData = await erc725.getData('AddressPermissions[]');
    const controllers = Array.isArray(controllersData.value) ? controllersData.value as string[] : [];
    const controllerExists = controllers.some(c => c.toLowerCase() === OPEN_COLLECTION_MANAGER_ADDRESS.toLowerCase());

    // 3. Encode and set the data
    const permissionData = erc725.encodeData([
      {
        keyName: 'AddressPermissions:Permissions:<address>',
        dynamicKeyParts: OPEN_COLLECTION_MANAGER_ADDRESS,
        value: erc725.encodePermissions(updatedPermissions),
      },
      // Only add to controllers array if not already present
      ...(controllerExists ? [] : [{
        keyName: 'AddressPermissions[]',
        value: [...controllers, OPEN_COLLECTION_MANAGER_ADDRESS]
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

  } catch (error) {
    console.error("❌ Error:", error);
    throw error;
  }
};

// async function main() {
//   if (!PRIVATE_KEY || !RPC_URL || !DEPLOYED_UP_ADDRESS || !OPEN_COLLECTION_MANAGER_ADDRESS) {
//     throw new Error("Missing environment variables");
//   }

//   const erc725 = new ERC725(LSP6Schema, DEPLOYED_UP_ADDRESS, RPC_URL);
//   const provider = new ethers.JsonRpcProvider(RPC_URL);
//   const signer = new ethers.Wallet(PRIVATE_KEY, provider);
//   const universalProfile = new ethers.Contract(DEPLOYED_UP_ADDRESS, UniversalProfileArtifact.abi, signer);

//   // Get existing permissions
//   const existingPermissions = await erc725.getData({
//     keyName: "AddressPermissions:Permissions:<address>",
//     dynamicKeyParts: OPEN_COLLECTION_MANAGER_ADDRESS,
//   });

//   // Decode existing permissions and combine with new ones
//   const decodedPermissions = existingPermissions.value 
//     ? erc725.decodePermissions(existingPermissions.value as string)
//     : {};

//   const updatedPermissions = {
//     ...decodedPermissions,
//     ADDCONTROLLER: true,
//     EDITPERMISSIONS: true,
//   };

//   // Get existing controllers
//   const controllersData = await erc725.getData('AddressPermissions[]');
//   const controllers = Array.isArray(controllersData.value) ? controllersData.value as string[] : [];
//   const controllerExists = controllers.some(c => c.toLowerCase() === OPEN_COLLECTION_MANAGER_ADDRESS.toLowerCase());

//   // Generate the permission keys
//   const permissionData = await erc725.encodeData([
//     {
//       keyName: "AddressPermissions:Permissions:<address>",
//       dynamicKeyParts: OPEN_COLLECTION_MANAGER_ADDRESS,
//       value: erc725.encodePermissions(updatedPermissions),
//     },
//     // Only add to controllers array if not already present
//     ...(controllerExists ? [] : [{
//       keyName: 'AddressPermissions[]',
//       value: [...controllers, OPEN_COLLECTION_MANAGER_ADDRESS]
//     }]),
//   ]);

//   // Create interface for the target contract
//   const targetInterface = new ethers.Interface(UniversalProfileArtifact.abi);
//   const calldata = targetInterface.encodeFunctionData("setDataBatch", [
//     permissionData.keys,
//     permissionData.values
//   ]);

//   console.log("Current permissions:", existingPermissions.value);
//   console.log("New permissions:", updatedPermissions);
//   console.log("Granting permissions to OpenCollectionManager...");

//   const tx = await universalProfile.execute(
//     0, // Operation type (CALL)
//     DEPLOYED_UP_ADDRESS,
//     0, // Value
//     calldata
//   );

//   await tx.wait();
//   console.log("Successfully granted permissions!");
// }

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 