import type { GamePhase } from "@frx/game-engine/logic/types";

export type { GamePhase };

export type RunCompletePayload = {
  attemptIndex: number;
  matches: number;
  durationMs: number;
  phase: GamePhase;
};
