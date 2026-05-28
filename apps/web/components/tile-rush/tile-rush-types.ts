import type { GamePhase } from "@/lib/tile-rush/types";

export type { GamePhase };

export type RunCompletePayload = {
  attemptIndex: number;
  matches: number;
  durationMs: number;
  phase: GamePhase;
};
