import { ethers } from 'ethers';
import { ERC725 } from '@erc725/erc725.js';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, RPC_URL, UP_ADDRESS, BENEFICIARY_ADDRESS } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !RPC_URL || !UP_ADDRESS || !BENEFICIARY_ADDRESS) {
    console.error("❌ Missing environment variables");
    return;
  }

  // Initialize erc725.js with the schemas of the permission data keys
  const erc725 = new ERC725(LSP6Schema, UP_ADDRESS, RPC_URL);

  // Create the permissions value
  const permissionSetAnyDataKey = erc725.encodePermissions({
    SUPER_CALL: true,
  });

  // Get current controllers count
  const addressPermissionsArrayValue = await erc725.getData('AddressPermissions[]');
  let numberOfControllers = 0;
  if (Array.isArray(addressPermissionsArrayValue.value)) {
    numberOfControllers = addressPermissionsArrayValue.value.length;
  }

  // Encode permission data exactly as in LUKSO example
  const permissionData = erc725.encodeData([
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: BENEFICIARY_ADDRESS,
      value: permissionSetAnyDataKey,
    },
    {
      keyName: 'AddressPermissions[]',
      value: [BENEFICIARY_ADDRESS],
      startingIndex: numberOfControllers,
      totalArrayLength: numberOfControllers + 1,
    },
  ]);

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

    if (updatedPermissions && typeof updatedPermissions.value === 'string') {
      console.log(
        `✅ Successfully added permissions to ${BENEFICIARY_ADDRESS}:`,
        erc725.decodePermissions(updatedPermissions.value),
      );
    }
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});