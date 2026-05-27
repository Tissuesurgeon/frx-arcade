import type { Server } from "socket.io";
import { SOCKET_NAMESPACES } from "@frx/shared";
import {
  getActiveWeeklyEpoch,
  getWeeklyJackpotPoolCredits,
} from "../services/economy";

let io: Server | null = null;

export function setSocketServer(server: Server) {
  io = server;
}

export async function buildJackpotTickPayload() {
  const epoch = await getActiveWeeklyEpoch();
  const poolCredits = getWeeklyJackpotPoolCredits(epoch);
  return {
    poolCredits,
    epochId: epoch.id,
    endsAt: epoch.endsAt.toISOString(),
    dailyContributions: epoch.dailyContributionCredits,
  };
}

export async function broadcastJackpotTick() {
  if (!io) return;
  const payload = await buildJackpotTickPayload();
  io.of(SOCKET_NAMESPACES.jackpot).emit("jackpot:tick", payload);
}
