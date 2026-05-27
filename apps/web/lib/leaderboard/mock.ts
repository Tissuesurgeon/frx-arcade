export type LeaderboardRow = {
  rank: number;
  player: string;
  score: number;
};

export const LEADERBOARD_ROWS: readonly LeaderboardRow[] = [
  { rank: 1, player: "neo_puzzle", score: 18420 },
  { rank: 2, player: "tile_witch", score: 17905 },
  { rank: 3, player: "frx_king", score: 17650 },
  { rank: 4, player: "cyan_rush", score: 16200 },
  { rank: 5, player: "vault_runner", score: 15890 },
  { rank: 6, player: "match_maker", score: 15100 },
] as const;

export function leaderboardRowClass(rank: number): string {
  if (rank === 1) {
    return "bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-transparent border-l-4 border-amber-400 shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]";
  }
  if (rank === 2) {
    return "bg-gradient-to-r from-slate-400/15 via-slate-300/10 to-transparent border-l-4 border-slate-400 shadow-[0_0_20px_-4px_rgba(148,163,184,0.3)]";
  }
  if (rank === 3) {
    return "bg-gradient-to-r from-amber-700/15 via-orange-600/10 to-transparent border-l-4 border-orange-500 shadow-[0_0_20px_-4px_rgba(249,115,22,0.25)]";
  }
  return "border-l-4 border-transparent hover:bg-white/[0.03]";
}
