"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LeaderboardEntry } from "@frx/shared";
import { apiFetch } from "@/lib/api";
import { useLeaderboardLive } from "@/lib/hooks/useSocket";
import { leaderboardRowClass } from "@/lib/leaderboard/mock";
import { truncateAddress } from "@/lib/utils";
import { Share2 } from "lucide-react";

type PoolLeaderboardProps = {
  tournamentId: string;
  showRewards?: boolean;
  compact?: boolean;
};

export function PoolLeaderboard({
  tournamentId,
  showRewards = true,
  compact = false,
}: PoolLeaderboardProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["leaderboard", tournamentId],
    queryFn: () =>
      apiFetch<{ entries: LeaderboardEntry[] }>(
        `/api/leaderboard/tournament/${tournamentId}`
      ),
    refetchInterval: 10_000,
  });

  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (data?.entries) setEntries(data.entries);
  }, [data?.entries]);

  useLeaderboardLive(
    tournamentId,
    useCallback((next) => setEntries(next), [])
  );

  if (isLoading && entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">Loading rankings…</p>
    );
  }

  if (entries.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-slate-500">
        No players yet — join this pool and be first on the board.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-slate-500">
            <th className={`${compact ? "px-3 py-2" : "px-4 py-3"}`}>Rank</th>
            <th className={`${compact ? "px-3 py-2" : "px-4 py-3"}`}>Player</th>
            <th
              className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-right`}
            >
              Score
            </th>
            {showRewards ? (
              <th
                className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-right`}
              >
                Reward
              </th>
            ) : null}
            {!compact ? (
              <th className="px-4 py-3 text-right">Share</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {entries.map((row) => (
            <tr
              key={`${row.wallet}-${row.rank}`}
              className={`border-b border-white/5 ${leaderboardRowClass(row.rank)}`}
            >
              <td
                className={`${compact ? "px-3 py-2" : "px-4 py-3"} font-bold tabular-nums text-indigo-300`}
              >
                #{row.rank}
              </td>
              <td
                className={`${compact ? "px-3 py-2" : "px-4 py-3"} font-mono text-slate-200`}
              >
                {row.displayName ?? truncateAddress(row.wallet)}
              </td>
              <td
                className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-right tabular-nums text-white`}
              >
                {row.score.toLocaleString()}
              </td>
              {showRewards ? (
                <td
                  className={`${compact ? "px-3 py-2" : "px-4 py-3"} text-right tabular-nums text-amber-200`}
                >
                  {row.rewardCredits > 0
                    ? `${row.rewardCredits.toLocaleString()} FRX`
                    : "—"}
                </td>
              ) : null}
              {!compact ? (
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-slate-400 hover:text-cyan-400"
                    onClick={() => {
                      void navigator.share?.({
                        title: "FRX Arcade Pool Rank",
                        text: `#${row.rank} — ${row.score} matches`,
                        url: window.location.href,
                      });
                    }}
                  >
                    <Share2 className="inline h-4 w-4" />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
