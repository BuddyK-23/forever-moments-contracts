// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// Import LUKSO Standards
import {LSP8Mintable} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/presets/LSP8Mintable.sol";
import {_LSP8_TOKENID_FORMAT_ADDRESS} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_TOKEN_TYPE_COLLECTION, _LSP4_METADATA_KEY} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";
import "@erc725/smart-contracts/contracts/interfaces/IERC725Y.sol";
import {LSP6Utils} from "@lukso/lsp-smart-contracts/contracts/LSP6KeyManager/LSP6Utils.sol";
import {_PERMISSION_CALL} from "@lukso/lsp-smart-contracts/contracts/LSP6KeyManager/LSP6Constants.sol";
import {LSP2Utils} from "@lukso/lsp2-contracts/contracts/LSP2Utils.sol";

import "./MomentMetadata.sol";
import "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";


contract MomentFactory is LSP8Mintable {
    using EnumerableSet for EnumerableSet.AddressSet;
    using EnumerableSet for EnumerableSet.Bytes32Set;

    // --- Constants
    address public constant LIKES_TOKEN = 0x97FC281993126249D7b875a531267Cea17B50B48;

    // --- Events
    event MomentMinted(address indexed recipient, bytes32 indexed tokenId, address indexed collectionUP, string description);
    event CollectionCreated(address indexed owner, address indexed collectionUP);
    event CollectionRemoved(address indexed owner, address indexed collectionUP);
    event PermissionsCheck(
        address indexed recipient,
        address indexed collectionUP,
        bytes32 permissionsKey,
        bytes permissions
    );
    event MomentURDUpdated(address indexed oldURD, address indexed newURD);

    // --- Storage
    EnumerableSet.AddressSet private _allCollections;
    EnumerableSet.AddressSet private _allMoments;
    mapping(address => address) private _collectionToOwner; // Mapping from collectionUP to ownerUP
    mapping(address => EnumerableSet.Bytes32Set) private _collectionMoments; // Mapping from collectionUP to set of tokenIds
    mapping(address => EnumerableSet.AddressSet) private _ownerToCollections; // Mapping from ownerUP to set of collectionUPs

    // Add URD address as state variable
    address public momentURD;

    constructor(
        string memory factoryName,
        string memory factorySymbol,
        address factoryOwner,
        bytes memory metadataURI,
        address _momentURD
    )
        LSP8Mintable(
            factoryName,
            factorySymbol,
            factoryOwner,
            _LSP4_TOKEN_TYPE_COLLECTION,
            _LSP8_TOKENID_FORMAT_ADDRESS
        )
    {
        _setData(_LSP4_METADATA_KEY, metadataURI);
        momentURD = _momentURD;
    }

    // --- Public functions

    // Set LSP4 metadata for Moment Factory
    function setMomentFactoryData(bytes calldata metadataURI) external onlyOwner {
        _setData(_LSP4_METADATA_KEY, metadataURI); 
    }

    // Store new Collection
    function storeCollection(address collectionUP, address controllerUP, address ownerUP) external {
        require(msg.sender == controllerUP, "Caller must be the owner of the collection");

        // Ensure the collectionUP hasn't already been added
        require(_collectionToOwner[collectionUP] == address(0), "Collection already exists");

        // Map the collectionUP to the ownerUP
        _collectionToOwner[collectionUP] = ownerUP;

        // Add the collectionUP to the set of collections for the ownerUP
        _ownerToCollections[ownerUP].add(collectionUP);

        // Add the collectionUP to the global set of all collections
        _allCollections.add(collectionUP);

        // Emit an event for transparency
        emit CollectionCreated(ownerUP, collectionUP);
    }

    // Remove a Collection from storage
    function removeCollection(address collectionUP) external onlyOwner {
        require(_collectionToOwner[collectionUP] != address(0), "Collection does not exist");
        
        // Get the owner before removing
        address ownerUP = _collectionToOwner[collectionUP];

        // Remove from all mappings and sets
        _ownerToCollections[ownerUP].remove(collectionUP);
        _allCollections.remove(collectionUP);
        delete _collectionToOwner[collectionUP];
        
        // Note: We keep the _collectionMoments mapping data for historical reference
        
        emit CollectionRemoved(ownerUP, collectionUP);
    }

    // Mint a Moment
    function mintMoment(
        address recipient,
        bytes calldata moment_metadataURI,
        bytes calldata LSP4_metadataURI,
        address collectionUP
    ) external returns (bytes32) {
        require(_collectionToOwner[collectionUP] != address(0), "Invalid collectionUP");
        address collectionOwnerUP = _collectionToOwner[collectionUP];

        // Check if recipient is owner or has permissions
        if (recipient != collectionOwnerUP) {
            // Get permissions using LSP6Utils
            bytes32 permissions = LSP6Utils.getPermissionsFor(
                IERC725Y(collectionUP),
                recipient
            );

            // Check CALL permission
            require(
                LSP6Utils.hasPermission(permissions, _PERMISSION_CALL),
                "Missing CALL permission"
            );

            // Get allowed calls using LSP6Utils
            bytes memory allowedCalls = LSP6Utils.getAllowedCallsFor(
                IERC725Y(collectionUP),
                recipient
            );

            // Verify it's in the correct LSP6 format
            require(
                LSP6Utils.isCompactBytesArrayOfAllowedCalls(allowedCalls),
                "Invalid allowed calls format"
            );

            // Check if this specific function call is allowed
            bytes memory expectedCall = abi.encodePacked(
                bytes4(0x00000002),    // CALL permission
                address(this),         // this contract
                bytes4(0xffffffff),    // any interface ID
                msg.sig                // function selector
            );

            bool hasAllowedCall = false;
            uint256 pointer = 0;
            while (pointer < allowedCalls.length) {
                uint256 elementLength = uint16(bytes2(abi.encodePacked(
                    allowedCalls[pointer],
                    allowedCalls[pointer + 1]
                )));
                
                bytes memory entry = new bytes(elementLength);
                for (uint i = 0; i < elementLength; i++) {
                    entry[i] = allowedCalls[pointer + 2 + i];
                }
                
                if (keccak256(entry) == keccak256(expectedCall)) {
                    hasAllowedCall = true;
                    break;
                }
                
                pointer += elementLength + 2;
            }

            require(hasAllowedCall, "Not allowed to call mintMoment");
        }

        // Create new moment
        MomentMetadata newContract = new MomentMetadata(
            recipient,
            address(this),
            moment_metadataURI,
            LSP4_metadataURI,
            LIKES_TOKEN,
            collectionOwnerUP,
            momentURD
        );

        bytes32 tokenId = bytes32(uint256(uint160(address(newContract))));
        
        // Mint the token
        _mint(recipient, tokenId, true, "");
        _setDataForTokenId(tokenId, _LSP4_METADATA_KEY, LSP4_metadataURI);

        // Store the moment address
        _allMoments.add(address(newContract));

        // Add the tokenId to the collection's set
        _collectionMoments[collectionUP].add(tokenId);

        // Emit event
        emit MomentMinted(recipient, tokenId, collectionUP, "Moment minted");

        return tokenId;
    }

    // Add function to update URD
    function setMomentURD(address newURD) external onlyOwner {
        require(newURD != address(0), "Invalid URD address");
        address oldURD = momentURD;
        momentURD = newURD;
        emit MomentURDUpdated(oldURD, newURD);
    }

    // --- View Functions

    // Get all collections
    function getAllCollections() external view returns (address[] memory) {
        return _allCollections.values();
    }

    // Get the owner of a collection
    function getCollectionOwner(address collectionUP) external view returns (address) {
        return _collectionToOwner[collectionUP];
    }

    // Get all collections owned by an owner
    function getCollectionsByOwner(address ownerUP) external view returns (address[] memory) {
        return _ownerToCollections[ownerUP].values();
    }

    // Check if a collection is owned by a specific owner
    function isCollectionOwnedBy(address collectionUP, address ownerUP) external view returns (bool) {
        return _collectionToOwner[collectionUP] == ownerUP;
    }

    // Get all moments in a collection
    function getMomentsInCollection(address collectionUP) external view returns (bytes32[] memory) {
        return _collectionMoments[collectionUP].values();
    }

    // Get total number of collections
    function getTotalCollections() external view returns (uint256) {
    return _allCollections.length();
    }

    // Get the total number of collections owned by an owner
    function getCollectionCountByOwner(address ownerUP) external view returns (uint256) {
        return _ownerToCollections[ownerUP].length();
    }

    // Get the total number of moments in a collection
    function getMomentCountInCollection(address collectionUP) external view returns (uint256) {
        return _collectionMoments[collectionUP].length();
    }

    // Add a view function to get all moments
    function getAllMoments() external view returns (address[] memory) {
        return _allMoments.values();
    }
}
