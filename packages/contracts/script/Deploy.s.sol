// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {HookMiner} from "../src/utils/HookMiner.sol";
import {FRXArcadeHook} from "../src/FRXArcadeHook.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {CreditManager} from "../src/CreditManager.sol";
import {TournamentPool} from "../src/TournamentPool.sol";
import {RewardDistributor} from "../src/RewardDistributor.sol";
import {SwapCreditRouter} from "../src/SwapCreditRouter.sol";
import {ArcadeQuoteToken} from "../src/ArcadeQuoteToken.sol";

contract Deploy is Script {
    using PoolIdLibrary for PoolKey;
    using CurrencyLibrary for Currency;

    uint160 internal constant HOOK_FLAGS =
        Hooks.AFTER_SWAP_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG;

    receive() external payable {}

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(pk);
        vm.startBroadcast(pk);

        IPoolManager poolManager = _resolvePoolManager(deployer);

        TreasuryVault vault = new TreasuryVault(deployer);
        CreditManager credits = new CreditManager(deployer);
        ArcadeQuoteToken quote = new ArcadeQuoteToken(deployer);

        (address hookAddr, bytes32 salt) = HookMiner.find(
            CREATE2_FACTORY,
            HOOK_FLAGS,
            type(FRXArcadeHook).creationCode,
            abi.encode(poolManager, vault, deployer)
        );

        FRXArcadeHook hook = new FRXArcadeHook{salt: salt}(poolManager, vault, deployer);
        require(address(hook) == hookAddr, "hook address mismatch");

        Currency currency0 = Currency.wrap(address(0));
        Currency currency1 = Currency.wrap(address(quote));

        PoolKey memory poolKey = PoolKey({
            currency0: currency0,
            currency1: currency1,
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        uint160 sqrtPriceX96 = TickMath.getSqrtPriceAtTick(0);
        poolManager.initialize(poolKey, sqrtPriceX96);

        SwapCreditRouter router = new SwapCreditRouter(
            address(poolManager),
            address(credits),
            poolKey,
            deployer
        );
        TournamentPool pool = new TournamentPool(address(credits), deployer);
        RewardDistributor distributor = new RewardDistributor(address(credits), deployer);

        credits.setMinter(address(router), true);
        credits.setMinter(address(pool), true);
        credits.setMinter(address(distributor), true);
        vault.setCreditManager(address(credits));
        vault.setRewardDistributor(address(distributor));

        quote.mint(deployer, 1_000_000 ether);
        PoolModifyLiquidityTest liquidityRouter = new PoolModifyLiquidityTest(poolManager);
        quote.approve(address(liquidityRouter), type(uint256).max);

        ModifyLiquidityParams memory liqParams = ModifyLiquidityParams({
            tickLower: -600,
            tickUpper: 600,
            liquidityDelta: 1 ether,
            salt: 0
        });

        uint256 liquidityEth = _liquidityEth();
        liquidityRouter.modifyLiquidity{value: liquidityEth}(
            poolKey,
            liqParams,
            ""
        );

        vm.stopBroadcast();

        console2.log("PoolManager", address(poolManager));
        console2.log("TreasuryVault", address(vault));
        console2.log("CreditManager", address(credits));
        console2.log("ArcadeQuoteToken", address(quote));
        console2.log("FRXArcadeHook", address(hook));
        console2.log("SwapCreditRouter", address(router));
        console2.log("TournamentPool", address(pool));
        console2.log("RewardDistributor", address(distributor));
        console2.log("PoolId", vm.toString(PoolId.unwrap(poolKey.toId())));
    }

    function _resolvePoolManager(address deployer) internal returns (IPoolManager poolManager) {
        try vm.envAddress("POOL_MANAGER_ADDRESS") returns (address configured) {
            if (configured != address(0)) {
                return IPoolManager(configured);
            }
        } catch {}

        poolManager = new PoolManager(deployer);
    }

    function _liquidityEth() internal view returns (uint256) {
        try vm.envUint("LIQUIDITY_ETH_WEI") returns (uint256 weiAmount) {
            return weiAmount;
        } catch {}

        return 0.1 ether;
    }
}
