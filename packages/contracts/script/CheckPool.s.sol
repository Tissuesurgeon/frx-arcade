// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";

contract CheckPool is Script {
    using StateLibrary for IPoolManager;

    function run() external view {
        IPoolManager pm = IPoolManager(vm.envAddress("POOL_MANAGER_ADDRESS"));
        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(vm.envAddress("ARCADE_QUOTE_TOKEN_ADDRESS")),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(vm.envAddress("FRX_ARCADE_HOOK_ADDRESS"))
        });

        (uint160 sqrtPrice, int24 tick,,) = pm.getSlot0(key.toId());
        uint128 liq = pm.getLiquidity(key.toId());
        console2.log("sqrtPrice", sqrtPrice);
        console2.logInt(tick);
        console2.log("liquidity", liq);
    }
}
