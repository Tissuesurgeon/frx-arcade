// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {CreditManager} from "./CreditManager.sol";

/// @title RewardDistributor — merkle-based tournament + jackpot reward claims
contract RewardDistributor is Ownable, ReentrancyGuard {
    CreditManager public immutable creditManager;

    bytes32 public merkleRoot;
    mapping(address => bool) public claimed;

    event MerkleRootUpdated(bytes32 root);
    event RewardClaimed(address indexed account, uint256 amount);

    constructor(address _creditManager, address initialOwner) Ownable(initialOwner) {
        creditManager = CreditManager(_creditManager);
    }

    function setMerkleRoot(bytes32 root) external onlyOwner {
        merkleRoot = root;
        emit MerkleRootUpdated(root);
    }

    function claim(
        address account,
        uint256 amount,
        bytes32[] calldata proof
    ) external nonReentrant {
        require(!claimed[account], "already claimed");
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(account, amount))));
        require(_verify(proof, merkleRoot, leaf), "invalid proof");
        claimed[account] = true;
        creditManager.mintCredits(account, amount, keccak256("REWARD_CLAIM"));
        emit RewardClaimed(account, amount);
    }

    function _verify(bytes32[] calldata proof, bytes32 root, bytes32 leaf) internal pure returns (bool) {
        bytes32 computed = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 p = proof[i];
            computed = computed <= p ? keccak256(abi.encodePacked(computed, p)) : keccak256(abi.encodePacked(p, computed));
        }
        return computed == root;
    }
}
