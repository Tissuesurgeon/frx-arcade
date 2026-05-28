import type { Server } from "socket.io";
import { SOCKET_NAMESPACES } from "@frx/shared";
import type { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  getActiveWeeklyEpoch,
  getWeeklyJackpotDisplayCredits,
} from "../services/economy";

let io: Server | null = null;

const ACTIVE_TOURNAMENT_FEED_WHERE: Prisma.TournamentWhereInput = {
  status: { in: ["OPEN", "LIVE", "CLOSED"] },
  type: { in: ["DAILY", "WEEKLY_JACKPOT", "PRACTICE"] },
};

export function setSocketServer(server: Server) {
  io = server;
}

function mapTournament(t: {
  id: string;
  slug: string;
  title: string;
  type: string;
  tier: string;
  status: string;
  entryFeeCredits: number;
  prizePoolCredits: number;
  rewardPoolCredits: number;
  playerCount: number;
  maxPlayers: number;
  startsAt: Date;
  endsAt: Date;
  jackpotMultiplier: number;
}) {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    type: t.type,
    tier: t.tier,
    status: t.status,
    entryFeeCredits: t.entryFeeCredits,
    prizePoolCredits: t.prizePoolCredits,
    rewardPoolCredits: t.rewardPoolCredits,
    playerCount: t.playerCount,
    maxPlayers: t.maxPlayers,
    startsAt: t.startsAt.toISOString(),
    endsAt: t.endsAt.toISOString(),
    jackpotMultiplier: t.jackpotMultiplier,
  };
}

export async function buildJackpotTickPayload() {
  const epoch = await getActiveWeeklyEpoch();
  const poolCredits = await getWeeklyJackpotDisplayCredits(epoch);
  return {
    poolCredits,
    epochId: epoch.id,
    endsAt: epoch.endsAt.toISOString(),
    dailyContributions: epoch.dailyContributionCredits,
    pendingContributions: poolCredits - epoch.dailyContributionCredits,
  };
}

export async function broadcastJackpotTick() {
  if (!io) return;
  const payload = await buildJackpotTickPayload();
  io.of(SOCKET_NAMESPACES.jackpot).emit("jackpot:tick", payload);
}

export async function broadcastTournamentFeed() {
  if (!io) return;
  const feed = await prisma.tournament.findMany({
    where: ACTIVE_TOURNAMENT_FEED_WHERE,
    orderBy: { startsAt: "desc" },
    take: 20,
  });
  io.of(SOCKET_NAMESPACES.tournaments).emit(
    "tournament:feed",
    feed.map(mapTournament)
  );
}

export async function broadcastEconomyUpdates() {
  await Promise.all([broadcastJackpotTick(), broadcastTournamentFeed()]);
}
