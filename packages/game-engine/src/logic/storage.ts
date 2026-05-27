import { STORAGE_TOTAL_SCORE } from "./constants";

export function readTotalScore(): number {
  if (typeof window === "undefined") return 0;
  const v = window.localStorage.getItem(STORAGE_TOTAL_SCORE);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

/** Adds this run's match count to the lifetime total (each finished run once). */
export function addRunScoreToTotal(runScore: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(runScore) || runScore <= 0) return;
  const next = readTotalScore() + Math.floor(runScore);
  window.localStorage.setItem(STORAGE_TOTAL_SCORE, String(next));
}
