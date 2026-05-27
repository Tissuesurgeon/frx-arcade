// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IUnlockCallback} from "@uniswap/v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {StateLibrary} from "@uniswap/v4-core/src/libraries/StateLibrary.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {PoolId, PoolIdLibrary} from "@uniswap/v4-core/src/types/PoolId.sol";
import {BalanceDelta} from "@uniswap/v4-core/src/types/BalanceDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {Currency} from "@uniswap/v4-core/src/types/Currency.sol";
import {TickMath} from "@uniswap/v4-core/src/libraries/TickMath.sol";
import {CurrencySettler} from "@uniswap/v4-core/test/utils/CurrencySettler.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CreditManager} from "./CreditManager.sol";

/// @title SwapCreditRouter — swaps OKB through a hooked V4 pool and mints FRX Credits
/// @dev Credits follow: 1 USD of OKB = 25 FRX credits (price stored as okbUsdPriceE8).
contract SwapCreditRouter is IUnlockCallback, Ownable {
    using PoolIdLibrary for PoolKey;
    using CurrencySettler for Currency;
    using StateLibrary for IPoolManager;

    uint256 public constant CREDITS_PER_USD = 25;
    uint256 public constant USD_PRICE_SCALE = 1e8;
    uint256 public constant OKB_WEI_SCALE = 1e18;

    IPoolManager public immutable poolManager;
    CreditManager public immutable creditManager;
    PoolKey public poolKey;

    /// @dev OKB/USD spot price with 8 decimals (e.g. $52.34 → 5_234_000_000).
    uint256 public okbUsdPriceE8;

    event CreditsPurchased(
        address indexed user,
        uint256 okbIn,
        uint256 creditsMinted,
        bytes32 indexed poolId
    );

    event OkbUsdPriceUpdated(uint256 oldPriceE8, uint256 newPriceE8);
    event DirectCreditsPurchased(
        address indexed user,
        uint256 okbIn,
        uint256 creditsMinted,
        bytes32 indexed poolId
    );

    struct CallbackData {
        address sender;
        uint256 okbIn;
    }

    constructor(
        address _poolManager,
        address _creditManager,
        PoolKey memory _poolKey,
        address initialOwner
    ) Ownable(initialOwner) {
        poolManager = IPoolManager(_poolManager);
        creditManager = CreditManager(_creditManager);
        poolKey = _poolKey;
    }

    function setOkbUsdPrice(uint256 priceE8) external onlyOwner {
        require(priceE8 > 0, "zero price");
        uint256 old = okbUsdPriceE8;
        okbUsdPriceE8 = priceE8;
        emit OkbUsdPriceUpdated(old, priceE8);
    }

    function computeCredits(uint256 okbIn) public view returns (uint256) {
        if (okbIn == 0 || okbUsdPriceE8 == 0) return 0;
        return (okbIn * okbUsdPriceE8 * CREDITS_PER_USD) / (OKB_WEI_SCALE * USD_PRICE_SCALE);
    }

    function swapForCredits() external payable {
        require(msg.value > 0, "zero deposit");
        require(okbUsdPriceE8 > 0, "price not set");
        require(computeCredits(msg.value) > 0, "credits too small");

        // When the V4 pool is drained (common on testnet), mint credits directly.
        if (poolManager.getLiquidity(poolKey.toId()) == 0) {
            _mintCreditsDirect(msg.sender, msg.value);
            return;
        }

        poolManager.unlock(abi.encode(CallbackData(msg.sender, msg.value)));
    }

    function _mintCreditsDirect(address user, uint256 okbIn) internal {
        uint256 credits = computeCredits(okbIn);
        require(credits > 0, "credits too small");
        creditManager.mintCredits(user, credits, keccak256("OKB_DIRECT"));
        bytes32 id = PoolId.unwrap(poolKey.toId());
        emit CreditsPurchased(user, okbIn, credits, id);
        emit DirectCreditsPurchased(user, okbIn, credits, id);
    }

    function unlockCallback(bytes calldata rawData) external returns (bytes memory) {
        require(msg.sender == address(poolManager), "not pool manager");

        CallbackData memory data = abi.decode(rawData, (CallbackData));
        require(data.okbIn > 0, "zero okb");
        require(Currency.unwrap(poolKey.currency0) == address(0), "native must be currency0");

        SwapParams memory params = SwapParams({
            zeroForOne: true,
            amountSpecified: -int256(data.okbIn),
            sqrtPriceLimitX96: TickMath.MIN_SQRT_PRICE + 1
        });

        BalanceDelta delta = poolManager.swap(poolKey, params, abi.encode(data.sender));

        int256 delta0 = delta.amount0();
        int256 delta1 = delta.amount1();

        if (delta0 < 0) {
            poolKey.currency0.settle(poolManager, address(this), uint256(-delta0), false);
        }
        if (delta1 < 0) {
            poolKey.currency1.settle(poolManager, address(this), uint256(-delta1), false);
        }
        if (delta0 > 0) {
            poolKey.currency0.take(poolManager, data.sender, uint256(delta0), false);
        }
        if (delta1 > 0) {
            poolKey.currency1.take(poolManager, data.sender, uint256(delta1), false);
        }

        uint256 credits = computeCredits(data.okbIn);
        require(credits > 0, "credits too small");
        creditManager.mintCredits(data.sender, credits, keccak256("V4_SWAP"));
        emit CreditsPurchased(data.sender, data.okbIn, credits, PoolId.unwrap(poolKey.toId()));

        return abi.encode(delta);
    }

    receive() external payable {}
}
