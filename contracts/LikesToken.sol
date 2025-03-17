// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {LSP7Mintable} from "@lukso/lsp-smart-contracts/contracts/LSP7DigitalAsset/presets/LSP7Mintable.sol";
import {_LSP4_TOKEN_TYPE_TOKEN, _LSP4_METADATA_KEY} from "@lukso/lsp4-contracts/contracts/LSP4Constants.sol";

contract LikesToken is LSP7Mintable {
    uint256 public likesPerLYX = 100;
    address public immutable treasury;

    mapping(address => uint256) public mintedLikes;

    event LikesMinted(address indexed user, uint256 lyxSpent, uint256 likesMinted);
    event TreasuryFunded(address indexed treasury, uint256 amount);
    event LYXWithdrawn(address indexed recipient, uint256 amount);
    event LikesPriceUpdated(uint256 oldPrice, uint256 newPrice);

    constructor(
        string memory name,
        string memory symbol,
        address contractOwner,
        address treasuryAddress,
        uint256 initialTreasuryLikes,
        bytes memory metadataURI
    ) 
        LSP7Mintable(
            name, 
            symbol, 
            contractOwner, 
            _LSP4_TOKEN_TYPE_TOKEN,
            false
        ) 
    {
        require(treasuryAddress != address(0), "Invalid treasury address");
        treasury = treasuryAddress;

        if (initialTreasuryLikes > 0) {
            _mint(treasury, initialTreasuryLikes * 10**decimals(), true, "");
            emit TreasuryFunded(treasuryAddress, initialTreasuryLikes);
        }

        _setData(_LSP4_METADATA_KEY, metadataURI);
    }

    /// Update LIKES price
    function setLikesPerLYX(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        uint256 oldPrice = likesPerLYX;
        likesPerLYX = newPrice;
        emit LikesPriceUpdated(oldPrice, newPrice);
    }

    /// Mint LIKES
    function mintLikes(address recipient) external payable {
        require(msg.value > 0, "Requires some LYX");

        uint256 likesToMint = msg.value * likesPerLYX;
        _mint(recipient, likesToMint, true, "");

        mintedLikes[recipient] += likesToMint;

        emit LikesMinted(recipient, msg.value, likesToMint);
    }

    /// Withdraw LYX from contract
    function withdrawLYX(address payable recipient, uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Not enough LYX in contract");
        require(recipient != address(0), "Invalid recipient");

        (bool success, ) = recipient.call{value: amount}("");
        require(success, "LYX withdrawal failed");

        emit LYXWithdrawn(recipient, amount);
    }
}
