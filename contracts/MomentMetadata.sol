// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import LUKSO Standards
import {ERC725Y} from "@erc725/smart-contracts/contracts/ERC725Y.sol";
import {LSP7DigitalAsset} from "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/LSP7DigitalAsset.sol";
import {_LSP8_REFERENCE_CONTRACT} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_METADATA_KEY} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";
import {ILSP1UniversalReceiver} from "@lukso/lsp1-contracts/contracts/ILSP1UniversalReceiver.sol";
import {ILSP1UniversalReceiverDelegate} from "@lukso/lsp1-contracts/contracts/ILSP1UniversalReceiverDelegate.sol";
import {LSP17Extendable} from "@lukso/lsp17contractextension-contracts/contracts/LSP17Extendable.sol";
import {LSP1Utils} from "@lukso/lsp1-contracts/contracts/LSP1Utils.sol";
import {LSP2Utils} from "@lukso/lsp2-contracts/contracts/LSP2Utils.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";


// constants
import {
    _INTERFACEID_LSP1,
    _INTERFACEID_LSP1_DELEGATE,
    _LSP1_UNIVERSAL_RECEIVER_DELEGATE_PREFIX,
    _LSP1_UNIVERSAL_RECEIVER_DELEGATE_KEY
} from "@lukso/lsp1-contracts/contracts/LSP1Constants.sol";
import {_LSP17_EXTENSION_PREFIX} from "@lukso/lsp17contractextension-contracts/contracts/LSP17Constants.sol";
import {
    _INTERFACEID_LSP0,
    _TYPEID_LSP0_VALUE_RECEIVED
} from "@lukso/lsp0-contracts/contracts/LSP0Constants.sol";

contract MomentMetadata is ERC725Y, ILSP1UniversalReceiver {
    // Custom data key constants
    bytes32 public constant _MOMENT_METADATA_KEY = 0x3569795c73940696ea152d91d7bf7a2a1543fcf430ff086ba45e1de82f924e81;
    bytes32 public constant TYPE_ID_LIKES = 0x20804611b3e2ea21c480dc465142210acf4a2485947541770ec1fb87dee4a55c;
    bytes32 public constant TYPE_ID_LSP7_RECEIVED = 0x20804611b3e2ea21c480dc465142210acf4a2485947541770ec1fb87dee4a55c;

    // LIKES Tracking
    LSP7DigitalAsset public likesToken;
    address public collectionOwner;
    uint256 public totalLikesWithdrawn;

    // Add the constant URD address
    address public immutable MOMENT_URD;

    // Event emitted when metadata is updated
    event LSP4MetadataUpdated(bytes32 indexed tokenId, bytes metadataURI, string description);
    event MetadataUpdated(bytes32 indexed tokenId, bytes metadataURI, string description);
    event LikesWithdrawn(address indexed owner, uint256 amount);

    constructor(
        address momentOwner, 
        address momentFactory, 
        bytes memory metadataURI, 
        bytes memory LSP4MetadataURI,
        address _likesToken,
        address _collectionOwner,
        address _momentURD
    ) ERC725Y(momentOwner) {
        MOMENT_URD = _momentURD;
        _setData(
            _LSP8_REFERENCE_CONTRACT,
            abi.encodePacked(momentFactory, bytes32(bytes20(address(this))))
        );

        // Store metadata
        _setData(_MOMENT_METADATA_KEY, metadataURI);
        _setData(_LSP4_METADATA_KEY, LSP4MetadataURI);

        // Set Likes Token
        likesToken = LSP7DigitalAsset(payable(_likesToken));
        collectionOwner = _collectionOwner;

        // Set the type-specific URD for LSP7
        bytes32 key = LSP2Utils.generateMappingKey(
            _LSP1_UNIVERSAL_RECEIVER_DELEGATE_PREFIX,
            bytes20(TYPE_ID_LSP7_RECEIVED)
        );
        _setData(key, abi.encodePacked(MOMENT_URD));

        // Set the default URD
        // _setData(
        //     _LSP1_UNIVERSAL_RECEIVER_DELEGATE_KEY,
        //     abi.encodePacked(MOMENT_URD)
        // );

        // Set LSP4Creators
        bytes32 LSP4_CREATORS_ARRAY_KEY = 0x114bd03b3a46d48759680d81ebb2b414fda7d030a7105a851867accf1c2352e7;
        _setData(
            LSP4_CREATORS_ARRAY_KEY, 
            abi.encodePacked(momentOwner)  // Add the moment owner as creator
        );
    }

    // --- ERC165 Compliance ---
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return 
            interfaceId == type(ILSP1UniversalReceiver).interfaceId || 
            super.supportsInterface(interfaceId);
    }

    function universalReceiver(
        bytes32 typeId,
        bytes memory receivedData
    ) public payable virtual override returns (bytes memory returnedValues) {
        // Handle native token reception first
        if (msg.value != 0 && typeId != _TYPEID_LSP0_VALUE_RECEIVED) {
            universalReceiver(_TYPEID_LSP0_VALUE_RECEIVED, receivedData);
        }

        bytes memory resultDefaultDelegate;
        bytes memory resultTypeIdDelegate;

        // 1. Call Default URD first
        bytes memory defaultURDValue = _getData(_LSP1_UNIVERSAL_RECEIVER_DELEGATE_KEY);
        if (defaultURDValue.length >= 20) {
            address defaultURD = address(bytes20(defaultURDValue));
            if (IERC165(defaultURD).supportsInterface(_INTERFACEID_LSP1_DELEGATE)) {
                resultDefaultDelegate = ILSP1UniversalReceiverDelegate(defaultURD)
                    .universalReceiverDelegate(msg.sender, msg.value, typeId, receivedData);
            }
        }

        // 2. Then call type-specific URD
        bytes32 typeIdKey = LSP2Utils.generateMappingKey(
            _LSP1_UNIVERSAL_RECEIVER_DELEGATE_PREFIX,
            bytes20(typeId)
        );
        bytes memory typeIdURDValue = _getData(typeIdKey);
        if (typeIdURDValue.length >= 20) {
            address typeIdURD = address(bytes20(typeIdURDValue));
            if (IERC165(typeIdURD).supportsInterface(_INTERFACEID_LSP1_DELEGATE)) {
                resultTypeIdDelegate = ILSP1UniversalReceiverDelegate(typeIdURD)
                    .universalReceiverDelegate(msg.sender, msg.value, typeId, receivedData);
            }
        }

        // Return combined results
        returnedValues = abi.encode(resultDefaultDelegate, resultTypeIdDelegate);
        emit UniversalReceiver(msg.sender, msg.value, typeId, receivedData, returnedValues);
        return returnedValues;
    }

    // --- Moment metadata updates ---
    function setLSP4Metadata(bytes32 tokenId, bytes calldata metadataURI) external onlyOwner {
        _setData(_LSP4_METADATA_KEY, metadataURI);
        emit LSP4MetadataUpdated(tokenId, metadataURI, "Metadata updated");
    }

    function setMomentMetadata(bytes32 tokenId, bytes calldata metadataURI) external onlyOwner {
        _setData(_MOMENT_METADATA_KEY, metadataURI);
        emit MetadataUpdated(tokenId, metadataURI, "Metadata updated");
    }

    // --- Likes ---
    function withdrawLikes(uint256 amount) external {
        require(msg.sender == owner(), "Only owner can withdraw");
        require(amount > 0, "Amount must be greater than 0");

        uint256 availableLikes = likesToken.balanceOf(address(this));
        require(amount <= availableLikes, "Not enough LIKES available for withdrawal");

        likesToken.transfer(address(this), msg.sender, amount, true, abi.encodePacked("Likes withdrawn"));

        emit LikesWithdrawn(msg.sender, amount);
    }

    function getWithdrawnLikes() external view returns (uint256) {
        return totalLikesWithdrawn;
    }

    // Add this helper function to verify the mapping
    function getURDForTypeId(bytes32 typeId) external view returns (address) {
        bytes32 key = LSP2Utils.generateMappingKey(
            _LSP1_UNIVERSAL_RECEIVER_DELEGATE_PREFIX,
            bytes20(typeId)
        );
        bytes memory value = _getData(key);
        require(value.length >= 20, "No URD set for this typeId");
        return address(bytes20(value));
    }
}


