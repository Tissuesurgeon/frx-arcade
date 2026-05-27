// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title CreditManager — non-transferable FRX Credits ledger (internal gameplay currency)
/// @notice Credits are soulbound platform balances, NOT an ERC-20 token.
contract CreditManager is Ownable {
    mapping(address => uint256) public credits;
    mapping(address => bool) public minters;

    uint256 public totalMinted;
    uint256 public totalBurned;

    event CreditsMinted(address indexed account, uint256 amount, bytes32 source);
    event CreditsBurned(address indexed account, uint256 amount, bytes32 reason);
    event MinterUpdated(address indexed minter, bool allowed);

    constructor(address initialOwner) Ownable(initialOwner) {}

    modifier onlyMinter() {
        require(minters[msg.sender] || msg.sender == owner(), "not minter");
        _;
    }

    function setMinter(address minter, bool allowed) external onlyOwner {
        minters[minter] = allowed;
        emit MinterUpdated(minter, allowed);
    }

    function balanceOf(address account) external view returns (uint256) {
        return credits[account];
    }

    function mintCredits(address account, uint256 amount, bytes32 source) external onlyMinter {
        require(account != address(0), "zero address");
        require(amount > 0, "zero amount");
        credits[account] += amount;
        totalMinted += amount;
        emit CreditsMinted(account, amount, source);
    }

    function burnCredits(address account, uint256 amount, bytes32 reason) external onlyMinter {
        require(credits[account] >= amount, "insufficient credits");
        credits[account] -= amount;
        totalBurned += amount;
        emit CreditsBurned(account, amount, reason);
    }

    /// @dev Explicitly non-transferable — no transfer function exists by design.
    function transferCredits(address, address, uint256) external pure {
        revert("FRX Credits are non-transferable");
    }
}
