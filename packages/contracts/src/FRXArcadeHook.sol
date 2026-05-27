// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {SafeCast} from "@uniswap/v4-core/src/libraries/SafeCast.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {IHooks} from "@uniswap/v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {CurrencyLibrary} from "@uniswap/v4-core/src/types/Currency.sol";
import {IERC20Minimal} from "@uniswap/v4-core/src/interfaces/external/IERC20Minimal.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {BaseHook} from "./utils/BaseHook.sol";
import {TreasuryVault} from "./TreasuryVault.sol";

/// @title FRXArcadeHook — Uniswap V4 hook that routes swap fees into gaming treasury buckets
contract FRXArcadeHook is BaseHook, Ownable {
    using SafeCast for uint256;
    using SafeCast for int128;
    using Hooks for IHooks;
    using CurrencyLibrary for Currency;

    TreasuryVault public immutable treasuryVault;

    uint16 public constant BPS = 10_000;
    uint128 public constant HOOK_SWAP_FEE_BPS = 500; // 5% of swap output captured by hook

    uint16 public tournamentTreasuryBps = 7000;
    uint16 public jackpotBps = 2000;
    uint16 public ecosystemReserveBps = 1000;

    uint256 public totalSwaps;
    uint256 public totalRouted;
    uint256 public jackpotAccumulated;
    uint256 public ecosystemAccumulated;

    event SwapRouted(
        address indexed sender,
        uint256 amount,
        uint256 toTreasury,
        uint256 toJackpot,
        uint256 toEcosystem
    );
    event SplitUpdated(uint16 tournamentTreasuryBps, uint16 jackpotBps, uint16 ecosystemReserveBps);

    constructor(IPoolManager _poolManager, TreasuryVault _treasuryVault, address initialOwner)
        BaseHook(_poolManager)
        Ownable(initialOwner)
    {
        treasuryVault = _treasuryVault;
    }

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize: false,
            afterInitialize: false,
            beforeAddLiquidity: false,
            afterAddLiquidity: false,
            beforeRemoveLiquidity: false,
            afterRemoveLiquidity: false,
            beforeSwap: false,
            afterSwap: true,
            beforeDonate: false,
            afterDonate: false,
            beforeSwapReturnDelta: false,
            afterSwapReturnDelta: true,
            afterAddLiquidityReturnDelta: false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    function setSplit(uint16 _treasury, uint16 _jackpot, uint16 _ecosystem) external onlyOwner {
        require(_treasury + _jackpot + _ecosystem == BPS, "must sum to 10000 bps");
        tournamentTreasuryBps = _treasury;
        jackpotBps = _jackpot;
        ecosystemReserveBps = _ecosystem;
        emit SplitUpdated(_treasury, _jackpot, _ecosystem);
    }

    function afterSwap(
        address sender,
        PoolKey calldata key,
        SwapParams calldata params,
        BalanceDelta delta,
        bytes calldata
    ) external override onlyPoolManager returns (bytes4, int128) {
        bool specifiedTokenIs0 = (params.amountSpecified < 0 == params.zeroForOne);
        (Currency feeCurrency, int128 swapAmount) =
            specifiedTokenIs0 ? (key.currency1, delta.amount1()) : (key.currency0, delta.amount0());

        if (swapAmount < 0) swapAmount = -swapAmount;
        if (swapAmount == 0) {
            return (IHooks.afterSwap.selector, 0);
        }

        uint256 feeAmount = (uint256(uint128(swapAmount)) * HOOK_SWAP_FEE_BPS) / BPS;
        if (feeAmount == 0) {
            return (IHooks.afterSwap.selector, 0);
        }

        poolManager.take(feeCurrency, address(this), feeAmount);
        _routeSwapProceeds(sender, feeCurrency, feeAmount);

        return (IHooks.afterSwap.selector, feeAmount.toInt128());
    }

    function _routeSwapProceeds(address sender, Currency feeCurrency, uint256 amount) internal {
        totalSwaps += 1;
        totalRouted += amount;

        uint256 toTreasury = (amount * tournamentTreasuryBps) / BPS;
        uint256 toJackpot = (amount * jackpotBps) / BPS;
        uint256 toEcosystem = amount - toTreasury - toJackpot;

        jackpotAccumulated += toJackpot;
        ecosystemAccumulated += toEcosystem;

        if (toTreasury > 0) {
            _forwardToTreasury(feeCurrency, toTreasury);
        }
        if (toJackpot > 0) {
            _forwardToTreasury(feeCurrency, toJackpot);
        }
        if (toEcosystem > 0) {
            _forwardToTreasury(feeCurrency, toEcosystem);
        }

        emit SwapRouted(sender, amount, toTreasury, toJackpot, toEcosystem);
    }

    function _forwardToTreasury(Currency currency, uint256 amount) internal {
        if (currency.isAddressZero()) {
            (bool ok,) = address(treasuryVault).call{value: amount}("");
            require(ok, "treasury transfer failed");
        } else {
            IERC20Minimal(Currency.unwrap(currency)).transfer(address(treasuryVault), amount);
        }
    }
}
