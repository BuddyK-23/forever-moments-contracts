// libs
import { ethers } from 'hardhat';
import { AbiCoder, Contract, keccak256 } from 'ethers';
import { ERC725 } from '@erc725/erc725.js';
import { readFileSync } from "fs";
import { PinataSDK } from "pinata-web3";
import { Blob } from "buffer";
import { config as LoadEnv } from "dotenv";

LoadEnv();

// LSPs Smart Contracts artifacts
import LSP23FactoryArtifact from '@lukso/lsp-smart-contracts/artifacts/LSP23LinkedContractsFactory.json';
import UniversalProfileInitArtifact from '@lukso/lsp-smart-contracts/artifacts/UniversalProfileInit.json';

// ERC725.js Metadata schemas
import LSP1UniversalReceiverDelegateSchemas from '@erc725/erc725.js/schemas/LSP1UniversalReceiverDelegate.json';
import LSP3ProfileMetadataSchemas from '@erc725/erc725.js/schemas/LSP3ProfileMetadata.json';
import LSP6KeyManagerSchemas from '@erc725/erc725.js/schemas/LSP6KeyManager.json';

// Import the MomentFactory ABI
import { MomentFactory__factory } from "../typechain-types";

// Constants
import {
  LSP23_FACTORY_ADDRESS_TESTNET,
  UNIVERSAL_PROFILE_IMPLEMENTATION_ADDRESS_TESTNET,
  LSP23_POST_DEPLOYMENT_MODULE_ADDRESS_TESTNET,
  LSP6_KEY_MANAGER_IMPLEMENTATION_ADDRESS_TESTNET,
  LSP1_UNIVERSAL_RECEIVER_ADDRESS_TESTNET,
} from '../global';

const { PRIVATE_KEY, UP_ADDRESS, PINATA_JWT_KEY, IPFS_GATEWAY_URL, MAIN_CONTROLLER_EOA, MOMENT_FACTORY_ADDRESS, PUBLIC_KEY } = process.env;

// Generate a unique salt using keccak256
function generateSalt(userAddress: string): string {
  const timestamp = Date.now().toString(); // Current timestamp
  return keccak256(new TextEncoder().encode(userAddress + timestamp));
}
const userAddress = MAIN_CONTROLLER_EOA;
const SALT = generateSalt(userAddress);
console.log('Generated Salt:', SALT);

async function uploadToPinata(filePath: string): Promise<string> {
  const pinata = new PinataSDK({
    pinataJwt: PINATA_JWT_KEY as string,
    pinataGateway: IPFS_GATEWAY_URL as string,
  });

  try {
    const blob = new Blob([readFileSync(filePath)], { type: "application/json" });
    const uploadResponse = await pinata.upload.file(blob);
    console.log("Pinata upload successful:", uploadResponse);
    return uploadResponse.IpfsHash; // Return only the IpfsHash
    // return `ipfs://${uploadResponse.IpfsHash}`;
  } catch (error) {
    console.error("Pinata upload failed:", error);
    throw new Error("Failed to upload to Pinata");
  }
}

function computeVerificationHash(metadataUrl: string): string {
  return keccak256(new TextEncoder().encode(metadataUrl));
}

async function main() {
  if (!PRIVATE_KEY || !UP_ADDRESS || !IPFS_GATEWAY_URL || !PINATA_JWT_KEY || !MAIN_CONTROLLER_EOA) {
    console.error("Missing environment variables. Please ensure PRIVATE_KEY, UP_ADDRESS, IPFS_GATEWAY_URL and PINATA_JWT_KEY are set in .env.");
    return;
  }

  
  const provider = ethers.provider;
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  //Handle LSP3 Profile Metadata
  const metadataPath = "assets/LSP3ProfileMetadata.json";
  const metadataHash = await uploadToPinata(metadataPath);
  console.log("Uploaded metadata hash:", metadataHash);
  const metadataUrl = `ipfs://${metadataHash}`;
  console.log("Metadata URL:", metadataUrl);
  const verificationHash = computeVerificationHash(metadataUrl);
  console.log("Updated verification hash:", verificationHash);
  const metadataJson = JSON.parse(readFileSync(metadataPath, "utf-8"));
  console.log("Metadata JSON:", metadataJson);

  //Handle Collection Metadata
  const collectionMetadataPath = "assets/CollectionMetadata.json";
  const collectionMetadataHash = await uploadToPinata(collectionMetadataPath);
  console.log("Uploaded metadata hash:", collectionMetadataHash);
  const collectionMetadataUrl = `ipfs://${collectionMetadataHash}`;
  console.log("Metadata URL:", collectionMetadataUrl);
  const collectionVerificationHash = computeVerificationHash(collectionMetadataUrl);
  console.log("Updated verification hash:", collectionVerificationHash);
  const collectionMetadataJson = JSON.parse(readFileSync(collectionMetadataPath, "utf-8"));
  console.log("Metadata JSON:", metadataJson);

  

  // Interacting with the LSP23Factory contract
  const lsp23FactoryContract = await ethers.getContractAtFromArtifact(
    LSP23FactoryArtifact,
    LSP23_FACTORY_ADDRESS_TESTNET,
    signer,
  );

  // Interacting with the UniversalProfileImplementation contract
  const universalProfileImplementationContract = await ethers.getContractAtFromArtifact(
    UniversalProfileInitArtifact,
    UNIVERSAL_PROFILE_IMPLEMENTATION_ADDRESS_TESTNET,
    signer, 
  );

  // create the init structs of LSP23 Linked Contracts Factory
  const universalProfileInitStruct = {
    salt: SALT,
    fundingAmount: 0,
    implementationContract: UNIVERSAL_PROFILE_IMPLEMENTATION_ADDRESS_TESTNET,
    initializationCalldata: universalProfileImplementationContract.interface.encodeFunctionData(
      'initialize',
      [LSP23_POST_DEPLOYMENT_MODULE_ADDRESS_TESTNET],
    ), // this will call the `initialize(...)` function of the Universal Profile and set the LSP23_POST_DEPLOYMENT_MODULE as `owner()`
  };

  const keyManagerInitStruct = {
    fundingAmount: 0,
    implementationContract: LSP6_KEY_MANAGER_IMPLEMENTATION_ADDRESS_TESTNET,
    addPrimaryContractAddress: true, // this will append the primary contract address to the init calldata
    initializationCalldata: '0xc4d66de8', // `initialize(address)` function selector
    extraInitializationParams: '0x',
  };

  // Load the Collection schema
  const collectionSchemaPath = "assets/CollectionMomentsSchema.json";
  const CollectionMomentsSchema = JSON.parse(readFileSync(collectionSchemaPath, "utf8"));

  //  instantiate the erc725.js class
  const erc725 = new ERC725([
    ...CollectionMomentsSchema,
    ...LSP6KeyManagerSchemas,
    ...LSP3ProfileMetadataSchemas,
    ...LSP1UniversalReceiverDelegateSchemas,
  ]);

  // create the permissions data keys - value pairs to be set
  const setDataKeysAndValues = erc725.encodeData([
    {
      keyName: "CollectionMetadata",
      value: {
        json: collectionMetadataJson,
        url: collectionMetadataUrl,
      },
    },
    { 
      keyName: 'LSP3Profile', 
      value: {
          // hashFunction: "keccak256(utf8)",
          // hash: metadataHash,
          url: metadataUrl,
          json: metadataJson,
      }
    },
    {
      keyName: 'LSP1UniversalReceiverDelegate',
      value: LSP1_UNIVERSAL_RECEIVER_ADDRESS_TESTNET,
    }, // Universal Receiver data key and value
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: [LSP1_UNIVERSAL_RECEIVER_ADDRESS_TESTNET],
      value: erc725.encodePermissions({
        REENTRANCY: true,
        SUPER_SETDATA: true,
      }),
    }, // Universal Receiver Delegate permissions data key and value
    {
      keyName: 'AddressPermissions:Permissions:<address>',
      dynamicKeyParts: [MAIN_CONTROLLER_EOA],
      value: erc725.encodePermissions({
        CHANGEOWNER: true,
        ADDCONTROLLER: true,
        EDITPERMISSIONS: true,
        ADDEXTENSIONS: true,
        CHANGEEXTENSIONS: true,
        ADDUNIVERSALRECEIVERDELEGATE: true,
        CHANGEUNIVERSALRECEIVERDELEGATE: true,
        REENTRANCY: false,
        SUPER_TRANSFERVALUE: true,
        TRANSFERVALUE: true,
        SUPER_CALL: true,
        CALL: true,
        SUPER_STATICCALL: true,
        STATICCALL: true,
        SUPER_DELEGATECALL: false,
        DELEGATECALL: false,
        DEPLOY: true,
        SUPER_SETDATA: true,
        SETDATA: true,
        ENCRYPT: true,
        DECRYPT: true,
        SIGN: true,
        EXECUTE_RELAY_CALL: true,
      }), // Main Controller permissions data key and value
    },
    // length of the Address Permissions array and their respective indexed keys and values
    {
      keyName: 'AddressPermissions[]',
      value: [LSP1_UNIVERSAL_RECEIVER_ADDRESS_TESTNET, MAIN_CONTROLLER_EOA],
    },
  ]);

  const abiCoder = new AbiCoder();
  const types = ['bytes32[]', 'bytes[]']; // types of the parameters

  const initializeEncodedBytes = abiCoder.encode(types, [
    setDataKeysAndValues.keys,
    setDataKeysAndValues.values,
  ]);

  // deploy the Universal Profile and its Key Manager
  const [upAddress, keyManagerAddress] = await lsp23FactoryContract.deployERC1167Proxies.staticCall(
    universalProfileInitStruct,
    keyManagerInitStruct,
    LSP23_POST_DEPLOYMENT_MODULE_ADDRESS_TESTNET,
    initializeEncodedBytes,
  );
  console.log('Universal Profile address:', upAddress);
  console.log('Key Manager address:', keyManagerAddress);

  const tx = await lsp23FactoryContract.deployERC1167Proxies(
    universalProfileInitStruct,
    keyManagerInitStruct,
    LSP23_POST_DEPLOYMENT_MODULE_ADDRESS_TESTNET,
    initializeEncodedBytes,
  );
  await tx.wait();

  // Call the MomentFactory contract to store the collection
  const momentFactory = MomentFactory__factory.connect(MOMENT_FACTORY_ADDRESS, signer);
  const storeTx = await momentFactory.storeCollection(upAddress, PUBLIC_KEY, UP_ADDRESS);
  console.log("Transaction sent to MomentFactory:", storeTx.hash);

  const storeReceipt = await storeTx.wait(1);
  console.log("Collection stored in MomentFactory:", storeReceipt.transactionHash);
}

main();
