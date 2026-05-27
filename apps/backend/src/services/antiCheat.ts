import { MAX_ATTEMPTS_PER_TOURNAMENT } from "@frx/shared";

/** Heuristic anti-cheat — deterministic rules before AI summary */

const MAX_MATCHES_PER_MINUTE = 45;
const MIN_MS_PER_MATCH = 400;

export type HeuristicResult = {
  flagged: boolean;
  reason: string;
  metadata: Record<string, unknown>;
};

export function validateScoreHeuristics(input: {
  matches: number;
  durationMs: number;
  attemptIndex: number;
}): HeuristicResult {
  const { matches, durationMs, attemptIndex } = input;

  if (attemptIndex < 1 || attemptIndex > MAX_ATTEMPTS_PER_TOURNAMENT) {
    return {
      flagged: true,
      reason: "Invalid attempt index",
      metadata: { attemptIndex },
    };
  }

  if (matches > 500) {
    return {
      flagged: true,
      reason: "Impossible match count",
      metadata: { matches, threshold: 500 },
    };
  }

  if (durationMs > 0 && matches > 0) {
    const msPerMatch = durationMs / matches;
    if (msPerMatch < MIN_MS_PER_MATCH) {
      return {
        flagged: true,
        reason: "Abnormal move speed",
        metadata: { msPerMatch, minExpected: MIN_MS_PER_MATCH },
      };
    }

    const minutes = durationMs / 60_000;
    const rate = matches / Math.max(minutes, 0.01);
    if (rate > MAX_MATCHES_PER_MINUTE) {
      return {
        flagged: true,
        reason: "Match rate exceeds human threshold",
        metadata: { rate, maxRate: MAX_MATCHES_PER_MINUTE },
      };
    }
  }

  return { flagged: false, reason: "", metadata: {} };
}
