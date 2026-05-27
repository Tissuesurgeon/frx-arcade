import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@frx/shared";
import { SOCKET_NAMESPACES } from "@frx/shared";
import { getCorsOrigin } from "../lib/cors";
import { prisma } from "../lib/prisma";
import { buildJackpotTickPayload, setSocketServer } from "./broadcast";

const ACTIVE_TOURNAMENT_FEED_WHERE = {
  status: { in: ["OPEN", "LIVE", "CLOSED"] as const },
  type: { in: ["DAILY", "WEEKLY_JACKPOT", "PRACTICE"] as const },
};

export function attachSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: getCorsOrigin(),
      credentials: true,
    },
  });

  setSocketServer(io);

  const tournamentsNs = io.of(SOCKET_NAMESPACES.tournaments);
  const leaderboardsNs = io.of(SOCKET_NAMESPACES.leaderboards);
  const jackpotNs = io.of(SOCKET_NAMESPACES.jackpot);

  tournamentsNs.on("connection", async (socket) => {
    const feed = await prisma.tournament.findMany({
      where: ACTIVE_TOURNAMENT_FEED_WHERE,
      orderBy: { startsAt: "desc" },
      take: 20,
    });

    socket.emit(
      "tournament:feed",
      feed.map(mapTournament)
    );

    socket.on("tournament:subscribe", (tournamentId: string) => {
      void socket.join(`tournament:${tournamentId}`);
    });

    socket.on("tournament:unsubscribe", (tournamentId: string) => {
      void socket.leave(`tournament:${tournamentId}`);
    });
  });

  leaderboardsNs.on("connection", (socket) => {
    socket.on("leaderboard:subscribe", async (tournamentId: string) => {
      void socket.join(`lb:${tournamentId}`);
      const entries = await fetchLeaderboard(tournamentId);
      socket.emit("leaderboard:snapshot", entries);
    });
  });

  jackpotNs.on("connection", async (socket) => {
    const payload = await buildJackpotTickPayload();
    socket.emit("jackpot:tick", payload);
  });

  startBroadcastLoops(tournamentsNs, leaderboardsNs, jackpotNs);

  return io;
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

async function fetchJackpotTick() {
  return buildJackpotTickPayload();
}

async function fetchLeaderboard(tournamentId: string) {
  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId },
    orderBy: [{ totalScore: "desc" }, { joinedAt: "asc" }],
    take: 50,
    include: { user: true },
  });

  return participants.map((p, i) => ({
    rank: p.rank ?? i + 1,
    wallet: p.user.wallet,
    displayName: p.user.displayName,
    score: p.totalScore,
    rewardCredits: p.rewardCredits,
    tournamentId,
  }));
}

function startBroadcastLoops(
  tournamentsNs: ReturnType<Server["of"]>,
  leaderboardsNs: ReturnType<Server["of"]>,
  jackpotNs: ReturnType<Server["of"]>
) {
  let revision = 0;

  setInterval(async () => {
    const feed = await prisma.tournament.findMany({
      where: ACTIVE_TOURNAMENT_FEED_WHERE,
      orderBy: { startsAt: "desc" },
      take: 20,
    });
    tournamentsNs.emit("tournament:feed", feed.map(mapTournament));
  }, 15_000);

  setInterval(async () => {
    const live = await prisma.tournament.findMany({
      where: { status: { in: ["OPEN", "LIVE", "CLOSED"] } },
      select: { id: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    });

    for (const t of live) {
      revision += 1;
      const entries = await fetchLeaderboard(t.id);
      leaderboardsNs.to(`lb:${t.id}`).emit("leaderboard:patch", {
        tournamentId: t.id,
        entries,
        revision,
      });
    }
  }, 10_000);

  setInterval(async () => {
    const payload = await fetchJackpotTick();
    jackpotNs.emit("jackpot:tick", payload);
  }, 30_000);
}
