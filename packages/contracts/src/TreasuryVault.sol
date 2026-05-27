// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TreasuryVault — holds collateral routed from FRXArcadeHook swaps
contract TreasuryVault is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public creditManager;
    address public rewardDistributor;

    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    event Deposited(address indexed from, uint256 amount);
    event TokenDeposited(address indexed token, address indexed from, uint256 amount);
    event Withdrawn(address indexed to, uint256 amount, bytes32 reason);
    event CreditManagerUpdated(address indexed creditManager);
    event RewardDistributorUpdated(address indexed rewardDistributor);

    constructor(address initialOwner) Ownable(initialOwner) {}

    receive() external payable {
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function setCreditManager(address _creditManager) external onlyOwner {
        creditManager = _creditManager;
        emit CreditManagerUpdated(_creditManager);
    }

    function setRewardDistributor(address _rewardDistributor) external onlyOwner {
        rewardDistributor = _rewardDistributor;
        emit RewardDistributorUpdated(_rewardDistributor);
    }

    function deposit() external payable nonReentrant {
        require(msg.value > 0, "zero amount");
        totalDeposited += msg.value;
        emit Deposited(msg.sender, msg.value);
    }

    function depositToken(address token, uint256 amount) external nonReentrant {
        require(token != address(0), "zero token");
        require(amount > 0, "zero amount");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(token, msg.sender, amount);
    }

    function withdrawTo(address to, uint256 amount, bytes32 reason) external nonReentrant {
        require(msg.sender == creditManager || msg.sender == rewardDistributor || msg.sender == owner(), "unauthorized");
        require(to != address(0), "zero address");
        require(address(this).balance >= amount, "insufficient balance");
        totalWithdrawn += amount;
        (bool ok,) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit Withdrawn(to, amount, reason);
    }
}
