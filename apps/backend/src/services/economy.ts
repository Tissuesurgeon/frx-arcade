import {
  DAILY_ENTRY_FEE,
  DAILY_MAX_PLAYERS,
  WEEKLY_ENTRY_FEE,
  WEEKLY_MAX_PLAYERS,
  WEEKLY_QUALIFICATION_DAILY_COMPLETIONS,
  WEEKLY_QUALIFICATION_SCORE_THRESHOLD,
  splitDailyEntryFee,
} from "@frx/shared";
import { prisma } from "../lib/prisma";

export async function getActiveWeeklyEpoch() {
  const now = new Date();
  let epoch = await prisma.weeklyJackpotPool.findFirst({
    where: { settled: false, startsAt: { lte: now }, endsAt: { gt: now } },
    orderBy: { startsAt: "desc" },
  });

  if (!epoch) {
    const startsAt = now;
    const endsAt = new Date(now.getTime() + 7 * 24 * 3600_000);
    epoch = await prisma.weeklyJackpotPool.create({
      data: {
        creditBalance: 0,
        hookContributionCredits: 0,
        dailyContributionCredits: 0,
        startsAt,
        endsAt,
      },
    });
  }

  return epoch;
}

export async function ensureCurrentSeason() {
  const now = new Date();
  let season = await prisma.season.findFirst({
    where: {
      status: "ACTIVE",
      startsAt: { lte: now },
      endsAt: { gt: now },
      tier: "MONTHLY",
    },
    orderBy: { startsAt: "desc" },
  });

  if (!season) {
    const startsAt = new Date(now.getFullYear(), now.getMonth(), 1);
    const endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthName = startsAt.toLocaleString("en-US", { month: "long" });
    season = await prisma.season.create({
      data: {
        name: `${monthName} ${startsAt.getFullYear()} Season`,
        tier: "MONTHLY",
        status: "ACTIVE",
        startsAt,
        endsAt,
      },
    });
  }

  return season;
}

/** Weekly jackpot pool = daily tournament 10% slices only (settled into epoch). */
export function getWeeklyJackpotPoolCredits(epoch: {
  dailyContributionCredits: number;
}): number {
  return epoch.dailyContributionCredits;
}

export async function ensurePlatformTreasury() {
  return prisma.platformTreasury.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", balance: 0 },
    update: {},
  });
}

export async function applyDailyEntrySplit(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  tournamentId: string,
  _weeklyEpochId: string,
  fee: number = DAILY_ENTRY_FEE
) {
  const split = splitDailyEntryFee(fee);

  await tx.tournament.update({
    where: { id: tournamentId },
    data: {
      rewardPoolCredits: { increment: split.rewards },
      prizePoolCredits: { increment: split.rewards },
      jackpotContributionCredits: { increment: split.weeklyJackpot },
    },
  });

  await tx.platformTreasury.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", balance: split.treasury },
    update: { balance: { increment: split.treasury } },
  });
}

/** Move a settled daily pool's 10% slice into the weekly jackpot epoch. */
export async function contributeTournamentJackpotToEpoch(
  tournamentId: string
): Promise<number> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (
    !tournament ||
    tournament.type !== "DAILY" ||
    tournament.jackpotContributedAt != null
  ) {
    return 0;
  }

  const amount = tournament.jackpotContributionCredits;
  if (amount <= 0) return 0;

  const epochId =
    tournament.weeklyEpochId ?? (await getActiveWeeklyEpoch()).id;

  await prisma.$transaction([
    prisma.weeklyJackpotPool.update({
      where: { id: epochId },
      data: {
        creditBalance: { increment: amount },
        dailyContributionCredits: { increment: amount },
      },
    }),
    prisma.tournament.update({
      where: { id: tournamentId },
      data: { jackpotContributedAt: new Date() },
    }),
  ]);

  const { broadcastJackpotTick } = await import("../socket/broadcast");
  await broadcastJackpotTick();

  return amount;
}

export async function getUserQualification(userId: string, weeklyEpochId: string) {
  return prisma.userQualification.upsert({
    where: {
      userId_weeklyEpochId: { userId, weeklyEpochId },
    },
    create: { userId, weeklyEpochId, dailyCompletions: 0 },
    update: {},
  });
}

export function isWeeklyQualified(
  dailyCompletions: number,
  bestDailyScore: number
): boolean {
  return (
    dailyCompletions >= WEEKLY_QUALIFICATION_DAILY_COMPLETIONS ||
    bestDailyScore >= WEEKLY_QUALIFICATION_SCORE_THRESHOLD
  );
}

export const dailyTournamentDefaults = {
  entryFeeCredits: DAILY_ENTRY_FEE,
  maxPlayers: DAILY_MAX_PLAYERS,
  type: "DAILY" as const,
  tier: "DAILY" as const,
};

export const weeklyTournamentDefaults = {
  entryFeeCredits: WEEKLY_ENTRY_FEE,
  maxPlayers: WEEKLY_MAX_PLAYERS,
  type: "WEEKLY_JACKPOT" as const,
  tier: "WEEKLY" as const,
};
