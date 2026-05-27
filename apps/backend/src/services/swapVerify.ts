import {
  decodeEventLog,
  type Hash,
  type Hex,
} from "viem";
import { computeCreditsFromOkbWeiPriceE8, XLAYER_CHAIN_ID } from "@frx/shared";
import { createXLayerPublicClient } from "../lib/xlayerRpc";
import { prisma } from "../lib/prisma";

const swapCreditRouterAbi = [
  {
    type: "event",
    name: "CreditsPurchased",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "okbIn", type: "uint256", indexed: false },
      { name: "creditsMinted", type: "uint256", indexed: false },
      { name: "poolId", type: "bytes32", indexed: true },
    ],
  },
  {
    type: "function",
    name: "okbUsdPriceE8",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const hookAbi = [
  {
    type: "event",
    name: "SwapRouted",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "toTreasury", type: "uint256", indexed: false },
      { name: "toJackpot", type: "uint256", indexed: false },
      { name: "toEcosystem", type: "uint256", indexed: false },
    ],
  },
] as const;

const poolManagerAbi = [
  {
    type: "event",
    name: "Swap",
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "sender", type: "address", indexed: true },
      { name: "amount0", type: "int128", indexed: false },
      { name: "amount1", type: "int128", indexed: false },
      { name: "sqrtPriceX96", type: "uint160", indexed: false },
      { name: "liquidity", type: "uint128", indexed: false },
      { name: "tick", type: "int24", indexed: false },
      { name: "fee", type: "uint24", indexed: false },
    ],
  },
] as const;

function getAddress(envKey: string): `0x${string}` | null {
  const addr = process.env[envKey];
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr as `0x${string}`;
}

function getSwapCreditRouterAddress(): `0x${string}` | null {
  return (
    getAddress("SWAP_CREDIT_ROUTER_ADDRESS") ??
    getAddress("DEPOSIT_ROUTER_ADDRESS")
  );
}

export type VerifiedSwap = {
  weiAmount: bigint;
  creditsMinted: bigint;
  poolId: Hex;
};

export async function verifySwapCreditTx(
  txHash: Hex,
  expectedWallet: string,
  expectedAmountWei: bigint
): Promise<VerifiedSwap> {
  const router = getSwapCreditRouterAddress();
  const hook = getAddress("FRX_ARCADE_HOOK_ADDRESS");
  const poolManager = getAddress("POOL_MANAGER_ADDRESS");

  if (!router) {
    throw new Error("Swap credit router not configured on server");
  }
  if (!hook) {
    throw new Error("FRX Arcade hook not configured on server");
  }
  if (!poolManager) {
    throw new Error("Pool manager not configured on server");
  }

  const client = createXLayerPublicClient();

  const receipt = await client.getTransactionReceipt({ hash: txHash });
  if (!receipt || receipt.status !== "success") {
    throw new Error("Transaction failed or not found");
  }

  const tx = await client.getTransaction({ hash: txHash });
  if (!tx || tx.from.toLowerCase() !== expectedWallet.toLowerCase()) {
    throw new Error("Transaction sender does not match wallet");
  }
  if (tx.to?.toLowerCase() !== router.toLowerCase()) {
    throw new Error("Transaction must call SwapCreditRouter");
  }
  if (tx.value !== expectedAmountWei) {
    throw new Error("Transaction value does not match amount");
  }

  let purchased: VerifiedSwap | null = null;
  let sawSwapRouted = false;
  let sawPoolSwap = false;

  for (const log of receipt.logs) {
    const logAddr = log.address.toLowerCase();

    if (logAddr === router.toLowerCase()) {
      try {
        const decoded = decodeEventLog({
          abi: swapCreditRouterAbi,
          data: log.data,
          topics: log.topics as [Hex, ...Hex[]] | [],
        });
        if (decoded.eventName !== "CreditsPurchased") continue;
        const user = decoded.args.user as string;
        if (user.toLowerCase() !== expectedWallet.toLowerCase()) {
          throw new Error("CreditsPurchased user mismatch");
        }
        purchased = {
          weiAmount: decoded.args.okbIn as bigint,
          creditsMinted: decoded.args.creditsMinted as bigint,
          poolId: decoded.args.poolId as Hex,
        };
      } catch (err) {
        if (err instanceof Error && err.message.includes("mismatch")) throw err;
      }
      continue;
    }

    if (logAddr === hook.toLowerCase()) {
      try {
        const decoded = decodeEventLog({
          abi: hookAbi,
          data: log.data,
          topics: log.topics as [Hex, ...Hex[]] | [],
        });
        if (decoded.eventName === "SwapRouted") {
          sawSwapRouted = true;
        }
      } catch {
        continue;
      }
      continue;
    }

    if (logAddr === poolManager.toLowerCase()) {
      try {
        const decoded = decodeEventLog({
          abi: poolManagerAbi,
          data: log.data,
          topics: log.topics as [Hex, ...Hex[]] | [],
        });
        if (decoded.eventName === "Swap") {
          sawPoolSwap = true;
        }
      } catch {
        continue;
      }
    }
  }

  if (!purchased) {
    throw new Error("CreditsPurchased event not found in transaction");
  }
  // Direct OKB deposit (empty V4 pool) skips hook/pool swap events.
  if (!sawSwapRouted && !sawPoolSwap) {
    if (purchased.weiAmount !== expectedAmountWei) {
      throw new Error("Purchased OKB amount mismatch");
    }
    return purchased;
  }
  if (!sawSwapRouted) {
    throw new Error("SwapRouted hook event not found in transaction");
  }
  if (!sawPoolSwap) {
    throw new Error("PoolManager Swap event not found in transaction");
  }
  if (purchased.weiAmount !== expectedAmountWei) {
    throw new Error("Purchased OKB amount mismatch");
  }

  let priceE8: bigint | null = null;
  try {
    priceE8 = await client.readContract({
      address: router,
      abi: swapCreditRouterAbi,
      functionName: "okbUsdPriceE8",
      blockNumber: receipt.blockNumber,
    });
  } catch {
    priceE8 = null;
  }

  if (priceE8 !== null && priceE8 > 0n) {
    const expectedCredits = computeCreditsFromOkbWeiPriceE8(
      purchased.weiAmount,
      priceE8
    );
    if (purchased.creditsMinted !== expectedCredits) {
      throw new Error("Credits minted do not match OKB/USD price at swap time");
    }
  }

  return purchased;
}

export function isSwapCreditRouterConfigured(): boolean {
  return (
    getSwapCreditRouterAddress() !== null &&
    getAddress("FRX_ARCADE_HOOK_ADDRESS") !== null &&
    getAddress("POOL_MANAGER_ADDRESS") !== null
  );
}

export async function isTxAlreadyCredited(txHash: Hash): Promise<boolean> {
  const existing = await prisma.creditLedgerEntry.findFirst({
    where: { txHash },
  });
  return !!existing;
}

export function getHookContractAddresses() {
  return {
    poolManagerAddress: process.env.POOL_MANAGER_ADDRESS ?? null,
    frxArcadeHookAddress: process.env.FRX_ARCADE_HOOK_ADDRESS ?? null,
    swapCreditRouterAddress: process.env.SWAP_CREDIT_ROUTER_ADDRESS ?? null,
    poolId: process.env.POOL_ID ?? null,
    arcadeQuoteTokenAddress: process.env.ARCADE_QUOTE_TOKEN_ADDRESS ?? null,
    chainId: Number(process.env.XLAYER_CHAIN_ID ?? XLAYER_CHAIN_ID),
  };
}
