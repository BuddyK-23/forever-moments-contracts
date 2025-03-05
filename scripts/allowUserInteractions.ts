import { ethers } from 'hardhat';
import { ERC725 } from '@erc725/erc725.js';
import LSP6Schema from '@erc725/erc725.js/schemas/LSP6KeyManager.json';
import UniversalProfileArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfile.json';
import { config as LoadEnv } from "dotenv";

LoadEnv();
const { PRIVATE_KEY, UP_ADDRESS, MOMENT_FACTORY_ADDRESS, RPC_URL } = process.env;

const main = async () => {
  if (!PRIVATE_KEY || !MOMENT_FACTORY_ADDRESS || !RPC_URL || !UP_ADDRESS) {
    console.error("Missing environment variables. Please ensure PRIVATE_KEY, RPC_URL and MOMENT_FACTORY_ADDRESS are set in .env.");
    return;
  }
  
  // Create a provider and signer
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  // Addresses
  const collectionUP = '0x6AbbE02bfbFD02B40e56fF5CaED27f63B6F1b54e';
  const userAddress = '0x2853A79BC6388fA8DaBB1415672E0a5CE08390a0';
  const momentFactoryAddress = MOMENT_FACTORY_ADDRESS;

  // Initialize ERC725.js with the LSP6 Schema
  const erc725 = new ERC725(LSP6Schema, UP_ADDRESS, 'https://rpc.testnet.lukso.network/');

  // Set the permissions
  const newMemberPermissions = erc725.encodePermissions({
    // CALL: true,
    SUPER_CALL: false,
  });

  // const allowedCalls = [
  //   "0x00000002",  // CALL permission (4 bytes)
  //   momentFactoryAddress,  // Contract address (20 bytes)
  //   "0xffffffff",  // Allow any standard interface (4 bytes)
  //   ethers.dataSlice(ethers.id("mintMoment(address,bytes,bytes,address)"), 0, 4)  // Function selector (4 bytes)
  // ];

  // Retrieve the current `AddressPermissions[]` array
  // Retrieve the current controllers list
  const currentControllers = await erc725.getData('AddressPermissions[]');
  const numberOfControllers = Array.isArray(currentControllers.value) ? currentControllers.value.length : 0;

  const updatedControllers = currentControllers.value
    ? [...currentControllers.value, userAddress] // Append new controller
    : [userAddress]; // Initialize if empty

  // Encode the data keys and values for permissions
  const permissionData = erc725.encodeData([
    // Assign permissions to the user address
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: userAddress,
      value: newMemberPermissions,
    },
    //Restrict `CALL` permission to the MomentFactory's `mintMoment` function
    // {
    //   keyName: "AddressPermissions:AllowedCalls:<address>",
    //   dynamicKeyParts: userAddress,
    //   value: allowedCalls,
    // },
    //Add the user address to the `AddressPermissions[]` array
    {
      keyName: "AddressPermissions[]",
      value: [userAddress],
      startingIndex: numberOfControllers,
      totalArrayLength: numberOfControllers + 1,
    },
  ]);

  // const currentPermissions = await erc725.getData({
  //   keyName: "AddressPermissions:Permissions:<address>",
  //   dynamicKeyParts: signer.address,
  // });
  // console.log("Signer Permissions:", erc725.decodePermissions(currentPermissions.value));  

  // Instantiate the UniversalProfile contract
  const universalProfile = new ethers.Contract(
    UP_ADDRESS,
    UniversalProfileArtifact.abi,
    signer
  );

  // Check if UP uses a Key Manager
  const keyManagerAddress = await universalProfile.owner();
  console.log("Key Manager Address:", keyManagerAddress);

  try {
    console.log("🚀 Sending transaction to grant permissions...");

    let tx;
    if (keyManagerAddress !== signer.address) {
      // Use Key Manager if UP is controlled
      const keyManager = new ethers.Contract(
        keyManagerAddress,
        ["function execute(bytes) public returns (bytes)"],
        signer
      );

      const payload = universalProfile.interface.encodeFunctionData(
        "setDataBatch",
        [permissionData.keys, permissionData.values]
      );

      tx = await keyManager.execute(payload, { gasLimit: 500000 });
    } else {
      // Directly update if no Key Manager
      tx = await universalProfile.setDataBatch(permissionData.keys, permissionData.values);
    }

    console.log("Transaction sent:", tx.hash);
    await tx.wait();

    console.log(`✅ Permissions successfully granted to ${userAddress}.`);

    // // Send the transaction to set permissions
    // const tx = await universalProfile.setData(permissionData.keys, permissionData.values);
    // console.log("Transaction sent:", tx.hash);
    // await tx.wait();

    // console.log(`✅ Permissions successfully granted to ${userAddress}.`);

    // Verify permissions
    const updatedPermissions = await erc725.getData({
      keyName: "AddressPermissions:Permissions:<address>",
      dynamicKeyParts: userAddress,
    });

    if (updatedPermissions && typeof updatedPermissions.value === 'string') {
      console.log(
        `✅ Successfully added the following permissions to address ${userAddress}:`,
        erc725.decodePermissions(updatedPermissions.value),
      );
    } else {
      console.error(
        `No permissions for beneficiary address ${userAddress} found`,
      );
    }
  } catch (error) {
    console.error("Error while granting permissions:", error);
  }
}

main().catch((error) => {
  console.error("Error:", error);
});

