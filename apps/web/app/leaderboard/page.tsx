"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/game/GameShell";
import { Container } from "@/components/Container";
import { PoolLeaderboard } from "@/components/tournament/PoolLeaderboard";
import { apiFetch } from "@/lib/api";
import type { Tournament } from "@frx/shared";
import { cn } from "@/lib/utils";

function poolLabel(t: Tournament) {
  if (t.type === "DAILY") return "Daily";
  if (t.type === "WEEKLY_JACKPOT") return "Weekly";
  return t.type;
}

export default function LeaderboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () =>
      apiFetch<{ tournaments: Tournament[] }>("/api/tournaments"),
    refetchInterval: 15_000,
  });

  const pools = useMemo(
    () =>
      (data?.tournaments ?? [])
        .filter((t) => t.type !== "PRACTICE" && t.status !== "SETTLED")
        .sort(
          (a, b) =>
            new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime()
        ),
    [data?.tournaments]
  );

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId = selectedId ?? pools[0]?.id ?? null;
  const activePool = pools.find((p) => p.id === activeId);

  return (
    <GameShell>
      <main className="flex-1 px-4 py-10 sm:py-14">
        <Container>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/90">
            Per-pool rankings
          </p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            Leaderboards
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Each tournament pool has its own live scoreboard — total of 3 Tile
            Rush attempts.
          </p>

          {isLoading ? (
            <p className="mt-8 text-slate-500">Loading pools…</p>
          ) : pools.length === 0 ? (
            <p className="mt-8 text-slate-500">
              No active pools — check back when the AI agent spawns a daily
              tournament.
            </p>
          ) : (
            <div className="mt-8 flex flex-col gap-6 lg:flex-row">
              <aside className="lg:w-72 lg:shrink-0">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Tournament pools
                </p>
                <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
                  {pools.map((pool) => (
                    <li key={pool.id} className="min-w-[200px] lg:min-w-0">
                      <button
                        type="button"
                        onClick={() => setSelectedId(pool.id)}
                        className={cn(
                          "w-full rounded-xl border px-3 py-3 text-left transition",
                          activeId === pool.id
                            ? "border-cyan-500/40 bg-cyan-500/10"
                            : "border-white/10 bg-white/5 hover:border-white/20"
                        )}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          {poolLabel(pool)} · {pool.status}
                        </p>
                        <p className="mt-0.5 truncate text-sm font-semibold text-white">
                          {pool.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          {pool.playerCount}/{pool.maxPlayers} players
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <div className="min-w-0 flex-1">
                {activePool ? (
                  <>
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-wider text-cyan-400/90">
                          {poolLabel(activePool)} pool
                        </p>
                        <h2 className="mt-1 text-xl font-bold text-white">
                          {activePool.title}
                        </h2>
                        <p className="mt-1 text-sm text-slate-400">
                          {activePool.playerCount}/{activePool.maxPlayers}{" "}
                          players · {activePool.status}
                        </p>
                      </div>
                      <Link
                        href={`/leaderboard/${activePool.id}`}
                        className="text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                      >
                        Open full page →
                      </Link>
                    </div>
                    <PoolLeaderboard tournamentId={activePool.id} />
                  </>
                ) : null}
              </div>
            </div>
          )}
        </Container>
      </main>
    </GameShell>
  );
}
