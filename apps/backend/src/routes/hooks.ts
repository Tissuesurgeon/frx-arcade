import { Router } from "express";
import { HOOK_SPLIT_BPS } from "@frx/shared";
import { prisma } from "../lib/prisma";
import { getHookContractAddresses } from "../services/swapVerify";
import { getActiveWeeklyEpoch, getWeeklyJackpotDisplayCredits } from "../services/economy";

export const hooksRouter = Router();

hooksRouter.get("/metrics", async (_req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daily = await prisma.hookMetricsDaily.findUnique({
    where: { date: today },
  });

  const totalRow = await prisma.hookMetricsDaily.aggregate({
    _sum: { totalSwaps: true },
  });

  const latestJackpot = await getActiveWeeklyEpoch();

  res.json({
    totalSwaps: totalRow._sum.totalSwaps ?? daily?.totalSwaps ?? 0,
    treasuryInflowWei: daily?.treasuryInflowWei ?? "0",
    jackpotVolumeWei: daily?.jackpotVolumeWei ?? "0",
    tournamentFundingWei: daily?.tournamentFundingWei ?? "0",
    ecosystemVolumeWei: daily?.ecosystemVolumeWei ?? "0",
    last24hSwaps: daily?.totalSwaps ?? 0,
    liquidityScore: daily?.liquidityScore ?? 0,
    splitBps: HOOK_SPLIT_BPS,
    weeklyJackpotCredits: await getWeeklyJackpotDisplayCredits(latestJackpot),
    jackpotEpoch: {
      id: latestJackpot.id,
      poolCredits: await getWeeklyJackpotDisplayCredits(latestJackpot),
      endsAt: latestJackpot.endsAt.toISOString(),
    },
  });
});

hooksRouter.get("/contracts", (_req, res) => {
  res.json(getHookContractAddresses());
});

hooksRouter.get("/flow", (_req, res) => {
  res.json({
    steps: [
      { id: 1, label: "User swaps OKB through hooked V4 pool", icon: "swap" },
      { id: 2, label: "FRXArcadeHook afterSwap captures fee delta", icon: "hook" },
      {
        id: 3,
        label: `Split: ${HOOK_SPLIT_BPS.tournamentTreasury / 100}% treasury · ${HOOK_SPLIT_BPS.jackpot / 100}% jackpot · ${HOOK_SPLIT_BPS.ecosystemReserve / 100}% reserve`,
        icon: "split",
      },
      { id: 4, label: "SwapCreditRouter mints FRX Credits", icon: "credits" },
      { id: 5, label: "Tournaments funded autonomously", icon: "trophy" },
    ],
  });
});
