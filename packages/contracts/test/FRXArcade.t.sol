// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Test} from "forge-std/Test.sol";
import {PoolManager} from "@uniswap/v4-core/src/PoolManager.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {Currency, CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolModifyLiquidityTest} from "@uniswap/v4-core/src/test/PoolModifyLiquidityTest.sol";
import {ModifyLiquidityParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {HookMiner} from "../src/utils/HookMiner.sol";
import {FRXArcadeHook} from "../src/FRXArcadeHook.sol";
import {TreasuryVault} from "../src/TreasuryVault.sol";
import {CreditManager} from "../src/CreditManager.sol";
import {TournamentPool} from "../src/TournamentPool.sol";
import {SwapCreditRouter} from "../src/SwapCreditRouter.sol";
import {ArcadeQuoteToken} from "../src/ArcadeQuoteToken.sol";

contract FRXArcadeTest is Test {
    using CurrencyLibrary for Currency;
    using StateLibrary for IPoolManager;

    receive() external payable {}

    uint160 internal constant HOOK_FLAGS =
        Hooks.AFTER_SWAP_FLAG | Hooks.AFTER_SWAP_RETURNS_DELTA_FLAG;

    IPoolManager manager;
    TreasuryVault vault;
    CreditManager credits;
    ArcadeQuoteToken quote;
    FRXArcadeHook hook;
    SwapCreditRouter router;
    TournamentPool pool;
    PoolModifyLiquidityTest liquidityRouter;
    PoolKey poolKey;

    address user = address(0xBEEF);
    address owner = address(this);

    uint256 internal constant TEST_OKB_USD_E8 = 100_00000000; // $100 / OKB

    function setUp() public {
        manager = new PoolManager(owner);
        vault = new TreasuryVault(owner);
        credits = new CreditManager(owner);
        quote = new ArcadeQuoteToken(owner);

        (address hookAddr, bytes32 salt) = HookMiner.find(
            owner,
            HOOK_FLAGS,
            type(FRXArcadeHook).creationCode,
            abi.encode(manager, vault, owner)
        );

        hook = new FRXArcadeHook{salt: salt}(manager, vault, owner);
        assertEq(address(hook), hookAddr);

        poolKey = PoolKey({
            currency0: Currency.wrap(address(0)),
            currency1: Currency.wrap(address(quote)),
            fee: 3000,
            tickSpacing: 60,
            hooks: IHooks(address(hook))
        });

        manager.initialize(poolKey, TickMath.getSqrtPriceAtTick(0));

        router = new SwapCreditRouter(address(manager), address(credits), poolKey, owner);
        router.setOkbUsdPrice(TEST_OKB_USD_E8);
        pool = new TournamentPool(address(credits), owner);
        liquidityRouter = new PoolModifyLiquidityTest(manager);

        credits.setMinter(address(router), true);
        credits.setMinter(address(pool), true);
        vault.setCreditManager(address(credits));

        quote.mint(owner, 1_000_000 ether);
        quote.approve(address(liquidityRouter), type(uint256).max);

        liquidityRouter.modifyLiquidity{value: 10 ether}(
            poolKey,
            ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: 100 ether, salt: 0}),
            ""
        );
    }

    function test_v4SwapRoutesHookFeeToTreasury() public {
        uint256 quoteBefore = quote.balanceOf(address(vault));

        vm.deal(user, 1 ether);
        vm.prank(user);
        router.swapForCredits{value: 0.1 ether}();

        assertGt(hook.totalSwaps(), 0);
        assertGt(hook.totalRouted(), 0);
        assertGt(quote.balanceOf(address(vault)), quoteBefore);
        assertEq(credits.balanceOf(user), 250); // 0.1 OKB × $100 × 25 credits/USD
    }

    function test_swapMintsCredits() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        router.swapForCredits{value: 0.05 ether}();
        assertEq(credits.balanceOf(user), 125); // 0.05 OKB × $100 × 25
    }

    function test_directMintWhenPoolEmpty() public {
        // Drain all liquidity — mirrors drained X Layer testnet pool state.
        liquidityRouter.modifyLiquidity(
            poolKey,
            ModifyLiquidityParams({tickLower: -600, tickUpper: 600, liquidityDelta: -100 ether, salt: 0}),
            ""
        );
        assertEq(manager.getLiquidity(poolKey.toId()), 0);

        vm.deal(user, 1 ether);
        vm.prank(user);
        router.swapForCredits{value: 0.02 ether}();
        assertEq(credits.balanceOf(user), 50); // 0.02 OKB × $100 × 25
    }

    function test_creditsNonTransferable() public {
        vm.expectRevert("FRX Credits are non-transferable");
        credits.transferCredits(user, address(1), 1);
    }

    function test_tournamentJoinBurnsCredits() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        router.swapForCredits{value: 1 ether}();

        uint256 id = pool.createTournament(10, 100, uint64(block.timestamp), uint64(block.timestamp + 1 days));

        vm.prank(user);
        pool.join(id);

        assertTrue(pool.joined(id, user));
        assertEq(pool.prizePoolOf(id), 10);
    }
}
