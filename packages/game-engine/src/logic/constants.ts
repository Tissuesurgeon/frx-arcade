/** MVP: deterministic board from this string + attempt index. */
export const TILE_RUSH_SEED = "frx-tile-rush-board-216-turtle-gapfill-v1";

/** 72 types × 3 copies = 216 tiles (144 Turtle + 72 gap-fill slots in `layout.ts`). */
export const TILE_TYPES = 72;
export const TILES_PER_TYPE = 3;
export const TOTAL_TILES = TILE_TYPES * TILES_PER_TYPE;

/**
 * Distinct face numbers 1..TILE_FACE_COUNT (`type % TILE_FACE_COUNT`). More values ⇒ rarer triples.
 * Keep `TILE_TYPES` divisible by this for an even count per face (here 72÷12=6 types per number).
 */
export const TILE_FACE_COUNT = 12;

/** Standard tray capacity after the easy phase. */
export const TRAY_MAX = 7;
/** Wider tray for the first few matches (lower difficulty). */
export const TRAY_MAX_EASY = 9;
/** After this many matches scored, tray shrinks to TRAY_MAX. */
export const MATCHES_BEFORE_HARD_TRAY = 5;

export function getTrayMax(matchesScored: number): number {
  return matchesScored < MATCHES_BEFORE_HARD_TRAY ? TRAY_MAX_EASY : TRAY_MAX;
}

export const MAX_ATTEMPTS = 3;

/** Countdown per run; at 0 the round ends (score = matches in that time). */
export const ROUND_TIME_SECONDS = 5 * 60;

/** Power-up: reshuffle types on the board; limited per run. */
export const SHUFFLES_PER_RUN = 2;

/** Sum of match counts from every completed run (persisted in this browser). */
export const STORAGE_TOTAL_SCORE = "frx-tile-rush-total-score";
