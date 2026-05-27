import { Router } from "express";
import { prisma } from "../lib/prisma";
import { getActiveWeeklyEpoch, ensureCurrentSeason, getWeeklyJackpotPoolCredits } from "../services/economy";

export const agentRouter = Router();
export const seasonsRouter = Router();

agentRouter.get("/signals", async (_req, res) => {
  const signals = await prisma.aISignal.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  res.json({
    signals: signals.map((s) => ({
      id: s.id,
      severity: s.severity,
      category: s.category,
      title: s.title,
      summary: s.summary,
      metadata: s.metadata,
      createdAt: s.createdAt.toISOString(),
    })),
  });
});

agentRouter.get("/economy", async (_req, res) => {
  const treasury = await prisma.platformTreasury.findUnique({
    where: { id: "singleton" },
  });
  const epoch = await getActiveWeeklyEpoch();
  const openDaily = await prisma.tournament.count({
    where: { type: "DAILY", status: { in: ["OPEN", "LIVE"] } },
  });

  res.json({
    platformTreasuryCredits: treasury?.balance ?? 0,
    weeklyJackpotCredits: getWeeklyJackpotPoolCredits(epoch),
    weeklyEpochEndsAt: epoch.endsAt.toISOString(),
    openDailyPools: openDaily,
  });
});

seasonsRouter.get("/current", async (_req, res) => {
  const season = await ensureCurrentSeason();
  const epoch = await getActiveWeeklyEpoch();

  res.json({
    season: {
      id: season.id,
      name: season.name,
      tier: season.tier,
      startsAt: season.startsAt.toISOString(),
      endsAt: season.endsAt.toISOString(),
    },
    weeklyJackpotCredits: getWeeklyJackpotPoolCredits(epoch),
  });
});

seasonsRouter.get("/:id/leaderboard", async (req, res) => {
  const stats = await prisma.userSeasonStats.findMany({
    where: { seasonId: req.params.id },
    orderBy: [{ totalRewards: "desc" }, { dailyCompletions: "desc" }],
    take: 50,
    include: { user: true },
  });

  res.json({
    entries: stats.map((s, i) => ({
      rank: i + 1,
      wallet: s.user.wallet,
      displayName: s.user.displayName,
      dailyCompletions: s.dailyCompletions,
      weeklyEntries: s.weeklyEntries,
      totalRewards: s.totalRewards,
    })),
  });
});
