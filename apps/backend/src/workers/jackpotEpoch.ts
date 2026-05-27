import { prisma } from "../lib/prisma";
import { getActiveWeeklyEpoch } from "../services/economy";

export async function rollWeeklyEpochIfNeeded() {
  const now = new Date();
  const expired = await prisma.weeklyJackpotPool.findFirst({
    where: { settled: false, endsAt: { lte: now } },
    orderBy: { endsAt: "desc" },
  });

  if (!expired) return;

  await prisma.weeklyJackpotPool.update({
    where: { id: expired.id },
    data: { settled: true },
  });

  const startsAt = now;
  const endsAt = new Date(now.getTime() + 7 * 24 * 3600_000);
  await prisma.weeklyJackpotPool.create({
    data: {
      creditBalance: 0,
      hookContributionCredits: 0,
      dailyContributionCredits: 0,
      startsAt,
      endsAt,
    },
  });

  await prisma.aISignal.create({
    data: {
      severity: "INFO",
      category: "jackpot_epoch",
      title: "Weekly jackpot epoch rolled",
      summary: "New weekly jackpot epoch started from daily tournament contributions.",
      metadata: { previousEpochId: expired.id },
    },
  });

  const { broadcastJackpotTick } = await import("../socket/broadcast");
  await broadcastJackpotTick();
}

export function startJackpotEpochWorker(intervalMs = 5 * 60_000): NodeJS.Timeout {
  const tick = () => {
    void rollWeeklyEpochIfNeeded().catch((err) =>
      console.error("[jackpot-epoch]", err)
    );
  };
  tick();
  return setInterval(tick, intervalMs);
}

// Keep export for tests — hook fees no longer fund the weekly jackpot pool.
export async function syncHookCreditsToWeeklyPool() {
  void getActiveWeeklyEpoch();
}
