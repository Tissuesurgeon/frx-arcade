import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getActiveWeeklyEpoch, getWeeklyJackpotDisplayCredits } from "../services/economy";

export const statsRouter = Router();

statsRouter.get("/landing", async (_req, res) => {
  const epoch = await getActiveWeeklyEpoch();

  const [activePlayers, liveTournaments, rewardAgg] = await Promise.all([
    prisma.user.count({
      where: { participations: { some: {} } },
    }),
    prisma.tournament.count({
      where: {
        type: { in: ["DAILY", "WEEKLY_JACKPOT"] },
        status: { in: ["OPEN", "LIVE", "CLOSED"] },
      },
    }),
    prisma.creditLedgerEntry.aggregate({
      where: { type: "REWARD" },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    activePlayers,
    liveTournaments,
    totalRewardsDistributed: rewardAgg._sum.amount ?? 0,
    weeklyJackpotCredits: await getWeeklyJackpotDisplayCredits(epoch),
  });
});
