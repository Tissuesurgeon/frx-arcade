// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";

/// @title HookMiner — finds CREATE2 salt for Uniswap v4 hook permission bits
library HookMiner {
    error HookMinerNotFound();

    /// @notice Find a salt that produces a hook address with the desired permission flags
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal view returns (address hookAddress, bytes32 salt) {
        bytes memory initCode = abi.encodePacked(creationCode, constructorArgs);
        bytes32 initCodeHash = keccak256(initCode);

        for (uint256 i = 0; i < 200_000; i++) {
            salt = bytes32(i);
            hookAddress = computeCreate2Address(deployer, salt, initCodeHash);
            if (uint160(hookAddress) & Hooks.ALL_HOOK_MASK == flags) {
                return (hookAddress, salt);
            }
        }
        revert HookMinerNotFound();
    }

    function computeCreate2Address(address deployer, bytes32 salt, bytes32 initCodeHash)
        internal
        pure
        returns (address)
    {
        return address(
            uint160(
                uint256(
                    keccak256(abi.encodePacked(bytes1(0xff), deployer, salt, initCodeHash))
                )
            )
        );
    }
}
