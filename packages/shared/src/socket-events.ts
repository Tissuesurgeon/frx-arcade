import type {
  HookMetrics,
  LeaderboardEntry,
  Tournament,
} from "./types";

/** Socket.IO event payloads — keep in sync with apps/backend */

export type ServerToClientEvents = {
  "tournament:update": (t: Tournament) => void;
  "tournament:feed": (tournaments: Tournament[]) => void;
  "leaderboard:snapshot": (entries: LeaderboardEntry[]) => void;
  "leaderboard:patch": (patch: LeaderboardPatch) => void;
  "jackpot:tick": (payload: JackpotTick) => void;
  "notification": (payload: NotificationPayload) => void;
};

export type ClientToServerEvents = {
  "tournament:subscribe": (tournamentId: string) => void;
  "tournament:unsubscribe": (tournamentId: string) => void;
  "leaderboard:subscribe": (tournamentId: string) => void;
};

export type LeaderboardPatch = {
  tournamentId: string;
  entries: LeaderboardEntry[];
  revision: number;
};

export type JackpotTick = {
  poolCredits: number;
  epochId: string;
  endsAt: string;
  dailyContributions?: number;
  hookContributions?: number;
};

export type NotificationPayload = {
  id: string;
  title: string;
  body: string;
  kind: "info" | "success" | "warning";
};

export type HookMetricsUpdate = HookMetrics;
