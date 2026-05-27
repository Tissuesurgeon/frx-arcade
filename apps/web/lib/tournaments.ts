import type { Tournament, TournamentParticipantStatus } from "@frx/shared";
import { fullDailyRewardPool } from "@frx/shared";

export function getVisibleDailyPools(
  tournaments: Tournament[],
  participations: Pick<
    TournamentParticipantStatus & { tournamentId: string },
    "tournamentId" | "enrolled" | "completed"
  >[] = []
): Tournament[] {
  const joinable = tournaments.find(
    (t) => t.type === "DAILY" && (t.status === "OPEN" || t.status === "LIVE")
  );
  const enrolledInProgress = tournaments.filter(
    (t) =>
      t.type === "DAILY" &&
      t.status === "CLOSED" &&
      participations.some(
        (p) => p.tournamentId === t.id && p.enrolled && !p.completed
      )
  );

  const seen = new Set<string>();
  const visible: Tournament[] = [];
  for (const pool of [joinable, ...enrolledInProgress]) {
    if (pool && !seen.has(pool.id)) {
      seen.add(pool.id);
      visible.push(pool);
    }
  }
  return visible;
}

export function getDailyRewardDisplay(t: Tournament): string {
  const current = t.rewardPoolCredits ?? t.prizePoolCredits;
  if (t.type !== "DAILY") return current.toLocaleString();
  const max = fullDailyRewardPool();
  if (current >= max) return current.toLocaleString();
  return `${current.toLocaleString()} / ${max.toLocaleString()}`;
}

export function pickDefaultTournament(
  tournaments: Tournament[],
  creditBalance: number,
  preferredId?: string | null
): Tournament | null {
  if (preferredId) {
    const preferred = tournaments.find((t) => t.id === preferredId);
    if (preferred && isJoinable(preferred, creditBalance)) return preferred;
  }

  const paid = tournaments
    .filter((t) => t.type !== "PRACTICE" && isJoinable(t, creditBalance))
    .sort((a, b) => {
      if (a.type === "DAILY" && b.type !== "DAILY") return -1;
      if (b.type === "DAILY" && a.type !== "DAILY") return 1;
      return a.entryFeeCredits - b.entryFeeCredits;
    });

  return paid[0] ?? null;
}

export function isJoinable(
  t: Tournament,
  creditBalance: number,
  participation?: Pick<TournamentParticipantStatus, "completed" | "enrolled">
): boolean {
  if (!["OPEN", "LIVE"].includes(t.status)) return false;
  if (t.playerCount >= t.maxPlayers) return false;
  if (participation?.completed) return false;
  if (t.type !== "PRACTICE" && creditBalance < t.entryFeeCredits) return false;
  return true;
}

export function getPoolStatus(
  tournamentId: string,
  participations: { tournamentId: string; completed: boolean; enrolled: boolean; attemptsUsed: number }[]
): "completed" | "in_progress" | "available" {
  const p = participations.find((x) => x.tournamentId === tournamentId);
  if (!p?.enrolled) return "available";
  if (p.completed) return "completed";
  return "in_progress";
}

export function formatApiError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return "Something went wrong";
}
