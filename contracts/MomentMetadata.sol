// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

// modules
import {ERC725Y} from "@erc725/smart-contracts/contracts/ERC725Y.sol";
import {_LSP8_REFERENCE_CONTRACT} from "@lukso/lsp-smart-contracts/contracts/LSP8IdentifiableDigitalAsset/LSP8Constants.sol";
import {_LSP4_METADATA_KEY} from "@lukso/lsp-smart-contracts/contracts/LSP4DigitalAssetMetadata/LSP4Constants.sol";

contract MomentMetadata is ERC725Y {
    // Event emitted when metadata is updated
    event MetadataUpdated(bytes32 indexed tokenId, bytes metadataURI, string description);

    constructor(address momentOwner, address momentFactory) ERC725Y(momentOwner) {
        _setData(
            _LSP8_REFERENCE_CONTRACT,
            abi.encodePacked(momentFactory, bytes32(bytes20(address(this))))
        );
    }

    // Set or update metadata for Moment
    function setMomentMetadata(bytes32 tokenId, bytes calldata metadataURI) external {
        _setData(_LSP4_METADATA_KEY, metadataURI);

        emit MetadataUpdated(tokenId, metadataURI, "Metadata updated");
    }
}


