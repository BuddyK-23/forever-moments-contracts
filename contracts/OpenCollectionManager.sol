// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LSP6Utils} from "@lukso/lsp-smart-contracts/contracts/LSP6KeyManager/LSP6Utils.sol";
import {_PERMISSION_SETDATA} from "@lukso/lsp-smart-contracts/contracts/LSP6KeyManager/LSP6Constants.sol";
import {IERC725Y} from "@erc725/smart-contracts/contracts/interfaces/IERC725Y.sol";
import {LSP2Utils} from "@lukso/lsp2-contracts/contracts/LSP2Utils.sol";

contract OpenCollectionManager {
    // Events
    event CollectionOpened(address indexed collectionUP, address indexed owner);
    event MemberJoined(address indexed collectionUP, address indexed member);
    
    // State variables
    mapping(address => bool) public isOpenCollection;
    mapping(address => address) public collectionOwners;
    address public immutable MOMENT_FACTORY;

    constructor(address _momentFactory) {
        MOMENT_FACTORY = _momentFactory;
    }

    // Collection owner calls this to make their collection open
    function openCollection(address collectionUP) external {
        // Verify caller has SETDATA permission on the collection
        bytes32 permissions = LSP6Utils.getPermissionsFor(
            IERC725Y(collectionUP),
            msg.sender
        );
        require(
            LSP6Utils.hasPermission(permissions, _PERMISSION_SETDATA),
            "Caller must have SETDATA permission"
        );

        isOpenCollection[collectionUP] = true;
        collectionOwners[collectionUP] = msg.sender;
        emit CollectionOpened(collectionUP, msg.sender);
    }

    // User calls this to join an open collection
    function joinCollection(address collectionUP) external {
        require(isOpenCollection[collectionUP], "Collection is not open");

        // Prepare the permission data
        bytes4 mintMomentSelector = bytes4(keccak256("mintMoment(address,bytes,bytes,address)"));
        
        // Set up the allowed calls array
        bytes memory allowedCall = abi.encodePacked(
            bytes4(0x00000002),  // CALL permission
            MOMENT_FACTORY,      // contract address
            bytes4(0xffffffff),  // any interface ID
            mintMomentSelector   // mintMoment function selector
        );

        // Generate the permission keys using LSP2Utils
        bytes32 permissionsKey = LSP2Utils.generateMappingKey(
            "AddressPermissions:Permissions",
            msg.sender
        );

        bytes32 allowedCallsKey = LSP2Utils.generateMappingKey(
            "AddressPermissions:AllowedCalls",
            msg.sender
        );

        // Set the permissions on the collection UP
        bytes32[] memory keys = new bytes32[](2);
        bytes[] memory values = new bytes[](2);
        
        keys[0] = permissionsKey;
        values[0] = abi.encodePacked(bytes4(0x00000002)); // CALL permission

        keys[1] = allowedCallsKey;
        values[1] = allowedCall;

        IERC725Y(collectionUP).setDataBatch(keys, values);

        emit MemberJoined(collectionUP, msg.sender);
    }

    // View functions
    function isCollectionOpen(address collectionUP) external view returns (bool) {
        return isOpenCollection[collectionUP];
    }

    function getCollectionOwner(address collectionUP) external view returns (address) {
        return collectionOwners[collectionUP];
    }
} 