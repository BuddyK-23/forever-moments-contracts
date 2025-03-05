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

  // Initialize ERC725 with the Collection UP address
  const erc725 = new ERC725(LSP6Schema, DEPLOYED_UP_ADDRESS, RPC_URL);

  // Check if our UP has EDITPERMISSIONS on the Collection UP
  const upPermissions = await erc725.getData({
    keyName: "AddressPermissions:Permissions:<address>",
    dynamicKeyParts: UP_ADDRESS,
  });

  // Verify UP has EDITPERMISSIONS
  const permissionsValue = upPermissions.value as string || "0x";
  const hasEditPermission = erc725.decodePermissions(permissionsValue)?.EDITPERMISSIONS;
  
  if (!hasEditPermission) {
    console.error("❌ Universal Profile does not have EDITPERMISSIONS permission on this Collection UP");
    return;
  }

  console.log("✅ Universal Profile verified as controller with EDITPERMISSIONS");
  console.log("📝 Granting permissions to:", BENEFICIARY_ADDRESS);

  // Get current controllers count
  const addressPermissionsArrayValue = await erc725.getData('AddressPermissions[]');
  let numberOfControllers = 0;
  if (Array.isArray(addressPermissionsArrayValue.value)) {
    numberOfControllers = addressPermissionsArrayValue.value.length;
  }

  // Format the new allowed call
  const mintMomentSelector = ethers.id("mintMoment(address,bytes,bytes,address)").slice(0, 10);
  
  // Encode permission data
  const permissionData = erc725.encodeData([
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
      value: erc725.encodePermissions({
        CALL: true,
      }),
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
  console.log("Keys:", permissionData.keys);
  console.log("Values:", permissionData.values);

  try {
    // Initialize provider and signer
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const signer = new ethers.Wallet(PRIVATE_KEY, provider);

    // Create UP contract instance for our UP (not the collection UP)
    const universalProfile = new ethers.Contract(
      UP_ADDRESS,
      UniversalProfileArtifact.abi,
      signer
    );

    // Encode the setDataBatch function call for the collection UP
    const setDataPayload = universalProfile.interface.encodeFunctionData(
      "setDataBatch",
      [permissionData.keys, permissionData.values]
    );

    // Execute through our UP to modify the collection UP
    const tx = await universalProfile.execute(
      0,                    // operation type (CALL)
      DEPLOYED_UP_ADDRESS,  // target (collection UP)
      0,                    // value
      setDataPayload,       // data
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

    if (allowedCallsData) {
      console.log("Raw AllowedCalls data:", allowedCallsData);
      console.log("AllowedCalls value type:", typeof allowedCallsData.value);
      
      if (Array.isArray(allowedCallsData.value)) {
        console.log("✅ Allowed Calls for ${BENEFICIARY_ADDRESS}:", allowedCallsData.value);
        allowedCallsData.value.forEach((call: any, index: number) => {
          console.log(`Call ${index}:`, call);
          if (call[3] === mintMomentSelector) {
            console.log(`✅ mintMoment function (${mintMomentSelector}) is allowed`);
          }
        });
      } else if (typeof allowedCallsData.value === 'string') {
        console.log(`✅ Allowed Calls for ${BENEFICIARY_ADDRESS}:`, allowedCallsData.value);
        if (allowedCallsData.value.toLowerCase().includes(mintMomentSelector.slice(2).toLowerCase())) {
          console.log(`✅ mintMoment function (${mintMomentSelector}) is allowed`);
        } else {
          console.log(`❌ mintMoment function (${mintMomentSelector}) not found in allowed calls`);
        }
      } else {
        console.log("❌ Unexpected AllowedCalls data format:", allowedCallsData.value);
      }
    } else {
      console.log("❌ No AllowedCalls data received");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

