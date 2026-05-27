import {
  computeDailyReward,
  computeWeeklyReward,
  MAX_ATTEMPTS_PER_TOURNAMENT,
} from "@frx/shared";
import { prisma } from "../lib/prisma";
import {
  ensureCurrentSeason,
  getActiveWeeklyEpoch,
  getUserQualification,
  contributeTournamentJackpotToEpoch,
  getWeeklyJackpotPoolCredits,
} from "../services/economy";
import { spawnDailyPoolIfNeeded } from "./agent";

async function creditReward(
  userId: string,
  amount: number,
  tournamentId: string,
  rank: number
) {
  if (amount <= 0) return;

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { creditBalance: { increment: amount } },
  });

  await prisma.creditLedgerEntry.create({
    data: {
      userId,
      type: "REWARD",
      amount,
      balanceAfter: updated.creditBalance,
      metadata: { tournamentId, rank },
    },
  });

  const season = await ensureCurrentSeason();
  await prisma.userSeasonStats.upsert({
    where: {
      userId_seasonId: { userId, seasonId: season.id },
    },
    create: {
      userId,
      seasonId: season.id,
      totalRewards: amount,
    },
    update: {
      totalRewards: { increment: amount },
    },
  });
}

async function incrementDailyQualification(userId: string) {
  const epoch = await getActiveWeeklyEpoch();
  const qual = await getUserQualification(userId, epoch.id);
  const next = qual.dailyCompletions + 1;
  await prisma.userQualification.update({
    where: { id: qual.id },
    data: {
      dailyCompletions: next,
      qualifiedAt: next >= 5 ? qual.qualifiedAt ?? new Date() : qual.qualifiedAt,
    },
  });

  const season = await ensureCurrentSeason();
  await prisma.userSeasonStats.upsert({
    where: {
      userId_seasonId: { userId, seasonId: season.id },
    },
    create: {
      userId,
      seasonId: season.id,
      dailyCompletions: 1,
    },
    update: {
      dailyCompletions: { increment: 1 },
    },
  });
}

export async function settleDailyTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.type !== "DAILY" || tournament.status === "SETTLED") {
    return;
  }

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    orderBy: [{ totalScore: "desc" }, { joinedAt: "asc" }],
  });

  if (participants.length === 0) {
    // Keep empty OPEN/LIVE dailies joinable; the agent recycles stale ones after 2h.
    if (tournament.status === "OPEN" || tournament.status === "LIVE") {
      return;
    }

    await prisma.tournament.update({
      where: { id: tournamentId },
      data: { status: "SETTLED" },
    });
    void spawnDailyPoolIfNeeded();
    return;
  }

  const allDone = participants.every(
    (p) =>
      p.completedAt != null || p.attemptsUsed >= MAX_ATTEMPTS_PER_TOURNAMENT
  );
  const expired = tournament.endsAt <= new Date();
  const poolFull =
    tournament.status === "CLOSED" ||
    tournament.playerCount >= tournament.maxPlayers;

  // Daily pools must reach capacity (or expire) before settling — a single
  // player finishing early must not close the pool and spawn a replacement.
  if (!poolFull && !expired) return;

  if (!allDone && !expired) return;

  for (let i = 0; i < participants.length; i++) {
    const rank = i + 1;
    const reward = computeDailyReward(rank);
    await prisma.tournamentParticipant.update({
      where: { id: participants[i].id },
      data: { rank, rewardCredits: reward },
    });
    await creditReward(participants[i].userId, reward, tournamentId, rank);

    if (
      participants[i].completedAt != null ||
      participants[i].attemptsUsed >= MAX_ATTEMPTS_PER_TOURNAMENT
    ) {
      await incrementDailyQualification(participants[i].userId);
    }
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "SETTLED" },
  });

  await contributeTournamentJackpotToEpoch(tournamentId);
  void spawnDailyPoolIfNeeded();
}

export async function settleWeeklyTournament(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { weeklyEpoch: true },
  });
  if (
    !tournament ||
    tournament.type !== "WEEKLY_JACKPOT" ||
    tournament.status === "SETTLED"
  ) {
    return;
  }

  if (tournament.endsAt > new Date()) return;

  const epoch = tournament.weeklyEpoch ?? (await getActiveWeeklyEpoch());
  const poolCredits =
    tournament.rewardPoolCredits + getWeeklyJackpotPoolCredits(epoch);

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    orderBy: [{ totalScore: "desc" }, { joinedAt: "asc" }],
  });

  for (let i = 0; i < participants.length; i++) {
    const rank = i + 1;
    const reward = computeWeeklyReward(rank, poolCredits);
    await prisma.tournamentParticipant.update({
      where: { id: participants[i].id },
      data: { rank, rewardCredits: reward },
    });
    await creditReward(participants[i].userId, reward, tournamentId, rank);

    const season = await ensureCurrentSeason();
    await prisma.userSeasonStats.upsert({
      where: {
        userId_seasonId: {
          userId: participants[i].userId,
          seasonId: season.id,
        },
      },
      create: {
        userId: participants[i].userId,
        seasonId: season.id,
        weeklyEntries: 1,
      },
      update: {
        weeklyEntries: { increment: 1 },
      },
    });
  }

  await prisma.tournament.update({
    where: { id: tournamentId },
    data: { status: "SETTLED" },
  });

  if (epoch.id) {
    await prisma.weeklyJackpotPool.update({
      where: { id: epoch.id },
      data: { settled: true, creditBalance: 0, dailyContributionCredits: 0 },
    });
  }
}

export async function runSettlementTick() {
  const pending = await prisma.tournament.findMany({
    where: {
      status: { in: ["CLOSED", "LIVE", "OPEN"] },
      type: { in: ["DAILY", "WEEKLY_JACKPOT"] },
    },
  });

  for (const t of pending) {
    if (t.type === "DAILY") {
      await settleDailyTournament(t.id);
    } else if (t.type === "WEEKLY_JACKPOT" && t.endsAt <= new Date()) {
      await settleWeeklyTournament(t.id);
    }
  }
}

export function startSettlementWorker(intervalMs = 3 * 60_000): NodeJS.Timeout {
  void runSettlementTick();
  return setInterval(() => {
    void runSettlementTick().catch((err) => {
      console.error("[settlement]", err);
    });
  }, intervalMs);
}
