// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title ArcadeQuoteToken — pool counter-asset for FRX Arcade V4 demo liquidity
/// @notice Not the gameplay credit token; used only as the V4 pool quote leg.
contract ArcadeQuoteToken is ERC20, Ownable {
    constructor(address initialOwner) ERC20("Arcade Quote", "aQUOTE") Ownable(initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
