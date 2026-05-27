// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {ArcadeQuoteToken} from "../src/ArcadeQuoteToken.sol";

/// @notice Adds OKB + quote liquidity so SwapCreditRouter swaps stop reverting.
contract SeedPoolLiquidity is Script {
    using StateLibrary for IPoolManager;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        IPoolManager pm = IPoolManager(vm.envAddress("POOL_MANAGER_ADDRESS"));
        ArcadeQuoteToken quote = ArcadeQuoteToken(vm.envAddress("ARCADE_QUOTE_TOKEN_ADDRESS"));

        PoolKey memory key = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(quote)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(vm.envAddress("FRX_ARCADE_HOOK_ADDRESS"))
        });

        (uint160 sqrtPriceBefore, int24 tickBefore,,) = pm.getSlot0(key.toId());
        uint128 liqBefore = pm.getLiquidity(key.toId());
        console2.log("Before sqrtPrice", sqrtPriceBefore);
        console2.logInt(tickBefore);
        console2.log("Before liquidity", liqBefore);

        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(pm);

        uint256 ethAmount = vm.envOr("LIQUIDITY_ETH_WEI", uint256(5 ether));
        uint128 liquidityDelta = uint128(vm.envOr("LIQUIDITY_DELTA", uint256(500 ether)));

        // Pool may sit at MIN_TICK with zero L — use full spaced range so liquidity is in-range.
        int24 tickLower = -887220;
        int24 tickUpper = 887220;

        vm.startBroadcast(pk);

        quote.mint(deployer, 1_000_000 ether);
        quote.approve(address(liquidityRouter), type(uint256).max);

        liquidityRouter.modifyLiquidity{value: ethAmount}(
            key,
            ModifyLiquidityParams({
                tickLower: tickLower,
                tickUpper: tickUpper,
                liquidityDelta: int128(int256(uint256(liquidityDelta))),
                salt: 0
            }),
            ""
        );

        vm.stopBroadcast();

        (uint160 sqrtPriceAfter, int24 tickAfter,,) = pm.getSlot0(key.toId());
        uint128 liqAfter = pm.getLiquidity(key.toId());
        console2.log("After sqrtPrice", sqrtPriceAfter);
        console2.logInt(tickAfter);
        console2.log("After liquidity", liqAfter);
    }
}
