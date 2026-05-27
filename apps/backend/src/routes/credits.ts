import { Router } from "express";
import { creditDepositSchema, creditWithdrawSchema } from "@frx/shared";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import {
  isSwapCreditRouterConfigured,
  isTxAlreadyCredited,
  verifySwapCreditTx,
  getHookContractAddresses,
} from "../services/swapVerify";
import { getOkbUsdPrice } from "../services/okbPrice";
import { readOnChainOkbPriceE8 } from "../services/priceSync";
import {
  getPayoutWalletBalance,
  isOkbPayoutConfigured,
  sendOkbPayout,
} from "../services/okbPayout";
import {
  CREDITS_PER_USD,
  computeCreditsFromOkbWei,
  computeOkbWeiFromCredits,
  formatOkbFromWei,
} from "@frx/shared";
import { parseEther } from "viem";

export const creditsRouter = Router();

creditsRouter.get("/balance", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.sub },
  });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ balance: user.creditBalance });
});

creditsRouter.get("/history", requireAuth, async (req: AuthedRequest, res) => {
  const entries = await prisma.creditLedgerEntry.findMany({
    where: { userId: req.user!.sub },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ entries });
});

creditsRouter.get("/deposit/config", async (_req, res) => {
  const contracts = getHookContractAddresses();
  let okbUsdPrice: number | null = null;
  let okbUsdPriceE8: string | null = null;
  let priceSource: string | null = null;
  let priceUpdatedAt: string | null = null;

  try {
    const spot = await getOkbUsdPrice();
    okbUsdPrice = spot.usd;
    okbUsdPriceE8 = spot.priceE8.toString();
    priceSource = spot.source;
    priceUpdatedAt = new Date(spot.fetchedAt).toISOString();
  } catch {
    // Spot feed unavailable — fall back to on-chain price if present.
  }

  const onChainE8 = await readOnChainOkbPriceE8();
  if (onChainE8 !== null && onChainE8 > 0n) {
    okbUsdPriceE8 = onChainE8.toString();
    if (okbUsdPrice === null) {
      okbUsdPrice = Number(onChainE8) / 1e8;
    }
  }

  res.json({
    configured: isSwapCreditRouterConfigured(),
    creditsPerUsd: CREDITS_PER_USD,
    okbUsdPrice,
    okbUsdPriceE8,
    priceSource,
    priceUpdatedAt,
    onChainOkbUsdPriceE8: onChainE8?.toString() ?? null,
    swapCreditRouterAddress: contracts.swapCreditRouterAddress,
    frxArcadeHookAddress: contracts.frxArcadeHookAddress,
    poolManagerAddress: contracts.poolManagerAddress,
    poolId: contracts.poolId,
    treasuryVaultAddress: process.env.TREASURY_VAULT_ADDRESS ?? null,
    chainId: contracts.chainId,
    depositRouterAddress: contracts.swapCreditRouterAddress,
    withdrawEnabled: isOkbPayoutConfigured(),
  });
});

creditsRouter.get("/withdraw/quote", async (req, res) => {
  const creditsRaw =
    typeof req.query.credits === "string" ? req.query.credits : "0";
  const amountCredits = Number(creditsRaw);
  if (!Number.isInteger(amountCredits) || amountCredits <= 0) {
    res.status(400).json({ error: "Invalid credits amount" });
    return;
  }

  let okbUsdPrice: number;
  try {
    okbUsdPrice = (await getOkbUsdPrice()).usd;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price fetch failed";
    res.status(503).json({ error: message });
    return;
  }

  const okbWei = computeOkbWeiFromCredits(amountCredits, okbUsdPrice);
  const payoutBalance = isOkbPayoutConfigured()
    ? await getPayoutWalletBalance()
    : 0n;

  res.json({
    creditsPerUsd: CREDITS_PER_USD,
    okbUsdPrice,
    amountCredits,
    estimatedOkbWei: okbWei.toString(),
    estimatedOkb: formatOkbFromWei(okbWei),
    withdrawEnabled: isOkbPayoutConfigured(),
    payoutBalanceWei: payoutBalance.toString(),
    payoutBalanceOkb: formatOkbFromWei(payoutBalance),
  });
});

creditsRouter.get("/deposit/quote", async (req, res) => {
  const amountStr = typeof req.query.amount === "string" ? req.query.amount : "0";
  let okbWei: bigint;
  try {
    okbWei = parseEther(amountStr);
  } catch {
    res.status(400).json({ error: "Invalid OKB amount" });
    return;
  }

  let okbUsdPrice: number;
  try {
    okbUsdPrice = (await getOkbUsdPrice()).usd;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price fetch failed";
    res.status(503).json({ error: message });
    return;
  }

  const credits = computeCreditsFromOkbWei(okbWei, okbUsdPrice);
  res.json({
    creditsPerUsd: CREDITS_PER_USD,
    okbUsdPrice,
    okbAmount: amountStr,
    estimatedCredits: credits.toString(),
    usdValue: Number(okbWei) / 1e18 * okbUsdPrice,
  });
});

creditsRouter.post("/deposit", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = creditDepositSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!isSwapCreditRouterConfigured()) {
    res.status(503).json({ error: "Swap credit router not configured" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const amountWei = BigInt(parsed.data.amountWei);
  if (amountWei <= 0n) {
    res.status(400).json({ error: "Amount too small" });
    return;
  }

  const txHash = parsed.data.txHash as `0x${string}`;

  if (await isTxAlreadyCredited(txHash)) {
    res.status(409).json({ error: "Transaction already credited" });
    return;
  }

  let verified;
  try {
    verified = await verifySwapCreditTx(
      txHash,
      user.wallet as `0x${string}`,
      amountWei
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Swap verification failed";
    res.status(400).json({ error: message });
    return;
  }

  const amountCredits = Number(verified.creditsMinted);
  if (amountCredits <= 0 || !Number.isSafeInteger(amountCredits)) {
    res.status(400).json({ error: "Invalid credits minted" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { creditBalance: { increment: amountCredits } },
  });

  await prisma.creditLedgerEntry.create({
    data: {
      userId: user.id,
      type: "DEPOSIT",
      amount: amountCredits,
      balanceAfter: updated.creditBalance,
      txHash: txHash,
      metadata: {
        amountWei: amountWei.toString(),
        poolId: verified.poolId,
        source: "v4_swap",
      },
    },
  });

  res.json({ balance: updated.creditBalance, credited: amountCredits });
});

creditsRouter.post("/withdraw", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = creditWithdrawSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  if (!isOkbPayoutConfigured()) {
    res.status(503).json({
      error: "Credit redemption not configured — set PRIVATE_KEY on backend",
    });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user || user.creditBalance < parsed.data.amountCredits) {
    res.status(400).json({ error: "Insufficient credits" });
    return;
  }

  let okbUsdPrice: number;
  try {
    okbUsdPrice = (await getOkbUsdPrice()).usd;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Price fetch failed";
    res.status(503).json({ error: message });
    return;
  }

  const okbWei = computeOkbWeiFromCredits(parsed.data.amountCredits, okbUsdPrice);
  if (okbWei <= 0n) {
    res.status(400).json({ error: "Amount too small for OKB redemption" });
    return;
  }

  const payoutBalance = await getPayoutWalletBalance();
  if (payoutBalance < okbWei) {
    res.status(503).json({ error: "Treasury has insufficient OKB for redemption" });
    return;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { creditBalance: { decrement: parsed.data.amountCredits } },
  });

  let txHash: `0x${string}`;
  try {
    txHash = await sendOkbPayout(user.wallet as `0x${string}`, okbWei);
  } catch (err) {
    await prisma.user.update({
      where: { id: user.id },
      data: { creditBalance: { increment: parsed.data.amountCredits } },
    });
    const message = err instanceof Error ? err.message : "OKB payout failed";
    res.status(502).json({ error: message });
    return;
  }

  await prisma.creditLedgerEntry.create({
    data: {
      userId: user.id,
      type: "WITHDRAW",
      amount: -parsed.data.amountCredits,
      balanceAfter: updated.creditBalance,
      txHash,
      metadata: {
        okbWei: okbWei.toString(),
        okbAmount: formatOkbFromWei(okbWei),
        okbUsdPrice,
        source: "treasury_payout",
      },
    },
  });

  res.json({
    balance: updated.creditBalance,
    okbOut: formatOkbFromWei(okbWei),
    okbWei: okbWei.toString(),
    txHash,
  });
});
