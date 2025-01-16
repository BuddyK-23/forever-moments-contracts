// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./MomentMetadata.sol"; // Contract to create Moment tokenID address

// Import LUKSO Standards
import {LSP8Mintable} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/presets/LSP8Mintable.sol";
import {_LSP8_TOKENID_FORMAT_ADDRESS} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_TOKEN_TYPE_COLLECTION, _LSP4_METADATA_KEY} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";


contract MomentFactory is LSP8Mintable {
    // Event emitted when a Moment is minted
    event MomentMinted(address indexed recipient, bytes32 indexed tokenId, bytes metadataURI, string description);

    // Constructor
    constructor(
        string memory factoryName,
        string memory factorySymbol,
        address factoryOwner,
        bytes memory metadataURI
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
    }

    // Set or update metadata for Moment Factory collection
    function setFactoryData(bytes calldata metadataURI) external {
        _setData(_LSP4_METADATA_KEY, metadataURI); 
    }

    // Mint a Moment
    function mintMoment(
      address recipient,
      bytes calldata metadataURI
    ) external returns (bytes32) {
        // Generate a new tokenId
        MomentMetadata newContract = new MomentMetadata(recipient, address(this));
        bytes32 tokenId = bytes32(uint256(uint160(address(newContract))));

        // Mint the Moment
        _mint(recipient, tokenId, true, "");

        // Emit an event for transparency
        emit MomentMinted(recipient, tokenId, metadataURI, "Moment minted");

        return tokenId;
    }
}
