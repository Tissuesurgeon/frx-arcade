// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CreditManager} from "../src/CreditManager.sol";
import {SwapCreditRouter} from "../src/SwapCreditRouter.sol";
import {FRXArcadeHook} from "../src/FRXArcadeHook.sol";
import {ArcadeQuoteToken} from "../src/ArcadeQuoteToken.sol";

/// @notice Deploys a price-aware SwapCreditRouter and swaps minter role from the old router.
contract UpgradeSwapRouter is Script {
    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);

        IPoolManager poolManager = IPoolManager(vm.envAddress("POOL_MANAGER_ADDRESS"));
        CreditManager credits = CreditManager(vm.envAddress("CREDIT_MANAGER_ADDRESS"));
        ArcadeQuoteToken quote = ArcadeQuoteToken(vm.envAddress("ARCADE_QUOTE_TOKEN_ADDRESS"));
        FRXArcadeHook hook = FRXArcadeHook(vm.envAddress("FRX_ARCADE_HOOK_ADDRESS"));
        SwapCreditRouter oldRouter = SwapCreditRouter(payable(vm.envAddress("SWAP_CREDIT_ROUTER_ADDRESS")));

        PoolKey memory poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(quote)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        vm.startBroadcast(pk);

        SwapCreditRouter newRouter = new SwapCreditRouter(
            address(poolManager),
            address(credits),
            poolKey,
            deployer
        );

        credits.setMinter(address(oldRouter), false);
        credits.setMinter(address(newRouter), true);

        uint256 price = oldRouter.okbUsdPriceE8();
        if (price > 0) {
            newRouter.setOkbUsdPrice(price);
        }

        vm.stopBroadcast();

        console2.log("Old SwapCreditRouter", address(oldRouter));
        console2.log("New SwapCreditRouter", address(newRouter));
        console2.log("Update SWAP_CREDIT_ROUTER_ADDRESS and NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS");
    }
}
