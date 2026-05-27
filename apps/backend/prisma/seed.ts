import { PrismaClient } from "@prisma/client";
import {
  DAILY_ENTRY_FEE,
  DAILY_MAX_PLAYERS,
  splitDailyEntryFee,
} from "@frx/shared";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const weekEnd = new Date(now.getTime() + 7 * 24 * 3600_000);
  const dayEnd = new Date(now.getTime() + 24 * 3600_000);

  const monthName = monthStart.toLocaleString("en-US", { month: "long" });

  const season = await prisma.season.upsert({
    where: { id: "seed-current-season" },
    create: {
      id: "seed-current-season",
      name: `${monthName} ${monthStart.getFullYear()} Season`,
      tier: "MONTHLY",
      status: "ACTIVE",
      startsAt: monthStart,
      endsAt: monthEnd,
    },
    update: {},
  });

  await prisma.platformTreasury.upsert({
    where: { id: "singleton" },
    create: { id: "singleton", balance: 0 },
    update: {},
  });

  const weeklyEpoch = await prisma.weeklyJackpotPool.upsert({
    where: { id: "seed-weekly-epoch" },
    create: {
      id: "seed-weekly-epoch",
      creditBalance: 0,
      hookContributionCredits: 0,
      dailyContributionCredits: 0,
      startsAt: now,
      endsAt: weekEnd,
    },
    update: {},
  });

  const split = splitDailyEntryFee(DAILY_ENTRY_FEE);

  await prisma.tournament.upsert({
    where: { slug: "daily-pool-001" },
    create: {
      slug: "daily-pool-001",
      title: "Daily Sprint Pool #1",
      type: "DAILY",
      tier: "DAILY",
      status: "OPEN",
      entryFeeCredits: DAILY_ENTRY_FEE,
      prizePoolCredits: 0,
      rewardPoolCredits: 0,
      playerCount: 0,
      maxPlayers: DAILY_MAX_PLAYERS,
      startsAt: now,
      endsAt: dayEnd,
      seasonId: season.id,
      weeklyEpochId: weeklyEpoch.id,
      createdBy: "SYSTEM",
    },
    update: {
      status: "OPEN",
      playerCount: 0,
      prizePoolCredits: 0,
      rewardPoolCredits: 0,
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.hookMetricsDaily.upsert({
    where: { date: today },
    create: {
      date: today,
      totalSwaps: 0,
      treasuryInflowWei: "0",
      jackpotVolumeWei: "0",
      tournamentFundingWei: "0",
      ecosystemVolumeWei: "0",
      liquidityScore: 0,
    },
    update: {},
  });

  console.log("Seed complete:", {
    season: season.name,
    dailyPool: "daily-pool-001",
    weeklyEpoch: weeklyEpoch.id,
    dailyEntrySplit: split,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
