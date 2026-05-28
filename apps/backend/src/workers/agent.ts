import {
  DAILY_ENTRY_FEE,
  DAILY_MAX_PLAYERS,
  WEEKLY_ENTRY_FEE,
  WEEKLY_MAX_PLAYERS,
} from "@frx/shared";
import { prisma } from "../lib/prisma";
import {
  dailyTournamentDefaults,
  ensureCurrentSeason,
  getActiveWeeklyEpoch,
  getWeeklyJackpotDisplayCredits,
  weeklyTournamentDefaults,
} from "../services/economy";

const OPENAI_KEY = process.env.OPENAI_API_KEY;

async function generatePoolTitle(kind: "daily" | "weekly"): Promise<string> {
  const base =
    kind === "daily"
      ? `Daily Sprint Pool`
      : `Weekly Jackpot Championship`;

  if (!OPENAI_KEY) {
    const n = Date.now().toString().slice(-4);
    return `${base} #${n}`;
  }

  try {
    const { ChatOpenAI } = await import("@langchain/openai");
    const llm = new ChatOpenAI({
      modelName: "gpt-4o-mini",
      temperature: 0.7,
      openAIApiKey: OPENAI_KEY,
    });
    const response = await llm.invoke(
      `Generate a short competitive arcade tournament title (max 6 words) for a ${kind} Tile Rush pool on X Layer testnet. Return title only.`
    );
    const title =
      typeof response.content === "string"
        ? response.content.trim().replace(/^["']|["']$/g, "")
        : base;
    return title.slice(0, 64) || base;
  } catch {
    return `${base} #${Date.now().toString().slice(-4)}`;
  }
}

export async function spawnDailyPoolIfNeeded(): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const activeDaily = await tx.tournament.count({
      where: { type: "DAILY", status: { in: ["OPEN", "LIVE", "CLOSED"] } },
    });
    if (activeDaily > 0) return false;

    const season = await ensureCurrentSeason();
    const epoch = await getActiveWeeklyEpoch();
    const title = await generatePoolTitle("daily");
    const now = new Date();
    const endsAt = new Date(now.getTime() + 24 * 3600_000);

    await tx.tournament.create({
      data: {
        slug: `daily-${Date.now()}`,
        title,
        status: "OPEN",
        entryFeeCredits: dailyTournamentDefaults.entryFeeCredits,
        maxPlayers: dailyTournamentDefaults.maxPlayers,
        type: dailyTournamentDefaults.type,
        tier: dailyTournamentDefaults.tier,
        prizePoolCredits: 0,
        rewardPoolCredits: 0,
        playerCount: 0,
        startsAt: now,
        endsAt,
        seasonId: season.id,
        weeklyEpochId: epoch.id,
        createdBy: "AGENT",
      },
    });

    await tx.aISignal.create({
      data: {
        severity: "INFO",
        category: "tournament_spawn",
        title: "Daily pool opened",
        summary: `AI agent spawned "${title}" (${DAILY_MAX_PLAYERS} seats, ${DAILY_ENTRY_FEE} FRX entry).`,
        metadata: { kind: "daily" },
      },
    });

    return true;
  });
}

export async function spawnWeeklyPoolIfNeeded(): Promise<boolean> {
  const epoch = await getActiveWeeklyEpoch();
  const msLeft = epoch.endsAt.getTime() - Date.now();
  if (msLeft > 24 * 3600_000) return false;

  const existing = await prisma.tournament.count({
    where: {
      type: "WEEKLY_JACKPOT",
      weeklyEpochId: epoch.id,
      status: { in: ["OPEN", "LIVE", "CLOSED"] },
    },
  });
  if (existing > 0) return false;

  const season = await ensureCurrentSeason();
  const title = await generatePoolTitle("weekly");
  const now = new Date();
  const jackpotPool = await getWeeklyJackpotDisplayCredits(epoch);

  await prisma.tournament.create({
    data: {
      slug: `weekly-${Date.now()}`,
      title,
      status: "OPEN",
      entryFeeCredits: weeklyTournamentDefaults.entryFeeCredits,
      maxPlayers: weeklyTournamentDefaults.maxPlayers,
      type: weeklyTournamentDefaults.type,
      tier: weeklyTournamentDefaults.tier,
      prizePoolCredits: jackpotPool,
      rewardPoolCredits: jackpotPool,
      playerCount: 0,
      startsAt: now,
      endsAt: epoch.endsAt,
      seasonId: season.id,
      weeklyEpochId: epoch.id,
      createdBy: "AGENT",
    },
  });

  await prisma.aISignal.create({
    data: {
      severity: "INFO",
      category: "tournament_spawn",
      title: "Weekly jackpot opened",
      summary: `AI agent opened weekly jackpot "${title}" (${WEEKLY_ENTRY_FEE} FRX entry). Pool: ${jackpotPool} credits.`,
      metadata: { kind: "weekly", epochId: epoch.id },
    },
  });

  return true;
}

export async function runTournamentAgentTick(): Promise<void> {
  const hookMetrics = await prisma.hookMetricsDaily.findFirst({
    orderBy: { date: "desc" },
  });
  const liquidityScore = hookMetrics?.liquidityScore ?? 0;

  await spawnDailyPoolIfNeeded();
  await spawnWeeklyPoolIfNeeded();

  const stale = await prisma.tournament.findFirst({
    where: {
      type: "DAILY",
      status: "OPEN",
      playerCount: 0,
      createdAt: { lt: new Date(Date.now() - 2 * 3600_000) },
    },
  });

  if (stale) {
    await prisma.tournament.update({
      where: { id: stale.id },
      data: { status: "CLOSED" },
    });
    await prisma.aISignal.create({
      data: {
        severity: "INFO",
        category: "pool_management",
        title: "Stale daily pool recycled",
        summary: `Closed empty pool "${stale.title}" after 2h with no joins.`,
        metadata: { tournamentId: stale.id },
      },
    });
    await spawnDailyPoolIfNeeded();
  }

  if (liquidityScore < 0.25) {
    await prisma.aISignal.create({
      data: {
        severity: "INFO",
        category: "reward_optimization",
        title: "Low swap liquidity",
        summary:
          "Hook liquidity is low — encourage OKB swaps to grow weekly jackpot funding.",
        metadata: { liquidityScore },
      },
    });
  }
}

export async function summarizeFlaggedScore(
  wallet: string,
  reason: string,
  matches: number
): Promise<void> {
  let summary = `Wallet ${wallet.slice(0, 8)}… flagged: ${reason} (${matches} matches). Review recommended.`;

  if (OPENAI_KEY) {
    try {
      const { ChatOpenAI } = await import("@langchain/openai");
      const llm = new ChatOpenAI({
        modelName: "gpt-4o-mini",
        temperature: 0.2,
        openAIApiKey: OPENAI_KEY,
      });
      const response = await llm.invoke(
        `Summarize this anti-cheat flag in one sentence for an admin dashboard: wallet=${wallet}, reason=${reason}, matches=${matches}`
      );
      summary =
        typeof response.content === "string"
          ? response.content
          : String(response.content);
    } catch (err) {
      console.warn("[agent] OpenAI unavailable:", err);
    }
  }

  await prisma.aISignal.create({
    data: {
      severity: "WARN",
      category: "anti_cheat",
      title: "Suspicious score flagged",
      summary,
      metadata: { wallet, reason, matches },
    },
  });
}

export function startAgentWorker(intervalMs = 2 * 60_000): NodeJS.Timeout {
  void runTournamentAgentTick().catch((err) => {
    console.error("[agent]", err);
  });
  return setInterval(() => {
    void runTournamentAgentTick().catch((err) => {
      console.error("[agent]", err);
    });
  }, intervalMs);
}
