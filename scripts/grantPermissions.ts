import { ethers } from 'hardhat';
import { ERC725 } from '@erc725/erc725.js';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { 
  PRIVATE_KEY,           // Collection owner's private key
  MOMENT_FACTORY_ADDRESS,
  RPC_URL, 
  DEPLOYED_UP_ADDRESS,   // Collection UP address
  BENEFICIARY_ADDRESS,    // Address to grant permissions to
  UP_ADDRESS             // Added UP_ADDRESS to the env vars
} = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !MOMENT_FACTORY_ADDRESS || !RPC_URL || !DEPLOYED_UP_ADDRESS || !BENEFICIARY_ADDRESS || !UP_ADDRESS) {
    console.error("❌ Missing environment variables");
    return;
  }
  
  // Replace hardhat provider with direct JsonRpcProvider
  // const provider = new ethers.JsonRpcProvider(RPC_URL);
  // const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Initialize ERC725 with the RPC URL
  const erc725 = new ERC725(LSP6Schema, UP_ADDRESS, RPC_URL);

  // Set the permissions value
  const newPermissions = erc725.encodePermissions({
    CALL: true,
  });

  // Check if UP (not signer) has EDITPERMISSIONS permission
  // const upPermissions = await erc725.getData({
  //   keyName: "AddressPermissions:Permissions:<address>",
  //   dynamicKeyParts: UP_ADDRESS, // Use UP_ADDRESS instead of signer.address
  // });

  // Add type assertion and null check
  // const permissionsValue = upPermissions.value as string || "0x";
  // const hasEditPermission = erc725.decodePermissions(permissionsValue)?.EDITPERMISSIONS;
  
  // if (!hasEditPermission) {
  //   console.error("❌ Universal Profile does not have EDITPERMISSIONS permission on this Collection UP");
  //   return;
  // }

  // console.log("✅ Universal Profile verified as controller with EDITPERMISSIONS");
  // console.log("📝 Granting permissions to:", BENEFICIARY_ADDRESS);

  // Get current controllers count
  const addressPermissionsArrayValue = await erc725.getData('AddressPermissions[]');
  let numberOfControllers = 0;
  if (Array.isArray(addressPermissionsArrayValue.value)) {
    numberOfControllers = addressPermissionsArrayValue.value.length;
  }

  // Format the AllowedCalls according to LSP6 spec
  const mintMomentSelector = ethers.id("mintMoment(address,bytes,bytes,address)").slice(0, 10);
  
  // Encode permission data
  const permissionData = erc725.encodeData([
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
      value: newPermissions,
    },
    {
      keyName: 'AddressPermissions:AllowedCalls:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
      value: [
        [
          "0x00000002",                // CALL permission (bit 1)
          MOMENT_FACTORY_ADDRESS,      // contract address
          "0xffffffff",                // any interface ID
          mintMomentSelector           // mintMoment function selector
        ]
      ]
    },
    {
      keyName: 'AddressPermissions[]',
      value: [BENEFICIARY_ADDRESS],
      startingIndex: numberOfControllers,
      totalArrayLength: numberOfControllers + 1,
    },
  ]);

  // Add console logs to inspect the data
  console.log("\nPermission Data:");
  console.log("Keys:", permissionData.keys);
  console.log("Values:", permissionData.values);

  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Create UP contract instance
    const universalProfile = new ethers.Contract(
      UP_ADDRESS,
      UniversalProfileArtifact.abi,
      signer
    );

    // Send transaction using setDataBatch instead of setData
    const tx = await universalProfile.setDataBatch(
      permissionData.keys,
      permissionData.values,
      { gasLimit: 300000 }
    );
    console.log("⏳ Transaction sent:", tx.hash);
    await tx.wait();

    // Verify the permissions
    const updatedPermissions = await erc725.getData({
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
    });

    // Verify AllowedCalls
    const allowedCallsData = await erc725.getData({
      keyName: 'AddressPermissions:AllowedCalls:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
    });

    console.log("\nVerification Results:");
    if (updatedPermissions && typeof updatedPermissions.value === 'string') {
      console.log(
        `✅ Permissions for ${BENEFICIARY_ADDRESS}:`,
        erc725.decodePermissions(updatedPermissions.value),
      );
    }

    if (allowedCallsData && typeof allowedCallsData.value === 'string') {
      console.log(
        `✅ Allowed Calls for ${BENEFICIARY_ADDRESS}:`,
        allowedCallsData.value
      );
      // Verify mintMoment function selector
      if (allowedCallsData.value.toLowerCase().includes(mintMomentSelector.slice(2).toLowerCase())) {
        console.log(`✅ mintMoment function (${mintMomentSelector}) is allowed`);
      } else {
        console.log(`❌ mintMoment function (${mintMomentSelector}) not found in allowed calls`);
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

