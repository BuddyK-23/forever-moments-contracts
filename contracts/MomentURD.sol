// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.20;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {ILSP1UniversalReceiverDelegate} from "@lukso/lsp-smart-contracts/contracts/LSP1UniversalReceiver/ILSP1UniversalReceiverDelegate.sol";

contract MomentURD is IERC165, ILSP1UniversalReceiverDelegate {
    event ReceivedTokens(address sender, uint256 value, bytes32 typeId, bytes data);
    event DecodedData(address from, address operator, address to, uint256 amount, bytes userData);
    event DecodedComment(string comment);
    event LikeStored(address indexed moment, address indexed sender, uint256 amount, string comment);

    struct Like {
        address sender;
        uint256 amount;
        string comment;
        uint256 timestamp;
    }
    
    // Mapping: moment address => array of likes
    mapping(address => Like[]) public momentLikes;

    function universalReceiverDelegate(
        address sender,
        uint256 value,
        bytes32 typeId,
        bytes memory data
    ) public override returns (bytes memory) {
        // Decode LSP7 transfer data
        (
            address from,
            address operator,
            address to,
            uint256 amount,
            bytes memory userData
        ) = abi.decode(data, (address, address, address, uint256, bytes));

        // Store the like
        string memory comment = string(userData);
        momentLikes[to].push(Like({
            sender: from,
            amount: amount,
            comment: comment,
            timestamp: block.timestamp
        }));

        emit LikeStored(to, from, amount, comment);
        return "";
    }

    function getLikes(address moment) external view returns (Like[] memory) {
        return momentLikes[moment];
    }

    function getTotalLikes(address moment) external view returns (uint256) {
        return momentLikes[moment].length;
    }

    function supportsInterface(bytes4 interfaceId) public pure override returns (bool) {
        return interfaceId == type(ILSP1UniversalReceiverDelegate).interfaceId;
    }
}