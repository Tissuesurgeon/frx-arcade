"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/game/GameShell";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { PoolLeaderboard } from "@/components/tournament/PoolLeaderboard";
import { apiFetch } from "@/lib/api";
import type { Tournament } from "@frx/shared";

export default function PoolLeaderboardPage() {
  const params = useParams<{ tournamentId: string }>();
  const tournamentId = params.tournamentId;

  const { data: tournament, isLoading: loadingTournament } = useQuery({
    queryKey: ["tournament", tournamentId],
    queryFn: () => apiFetch<Tournament>(`/api/tournaments/${tournamentId}`),
    enabled: !!tournamentId,
  });

  return (
    <GameShell>
      <main className="flex-1 px-4 py-10 sm:py-14">
        <Container>
          <Button href="/leaderboard" variant="secondary" className="mb-6">
            ← All pools
          </Button>

          {loadingTournament ? (
            <p className="text-slate-500">Loading pool…</p>
          ) : !tournament ? (
            <p className="text-slate-500">Tournament not found.</p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
                {tournament.type === "DAILY"
                  ? "Daily pool"
                  : tournament.type === "WEEKLY_JACKPOT"
                    ? "Weekly jackpot"
                    : "Tournament"}{" "}
                · Live
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                {tournament.title}
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                {tournament.playerCount}/{tournament.maxPlayers} players ·{" "}
                {tournament.status} · score = sum of 3 attempts
              </p>

              <div className="mt-8">
                <PoolLeaderboard tournamentId={tournamentId} />
              </div>

              {tournament.status !== "SETTLED" ? (
                <p className="mt-6 text-center text-sm text-slate-500">
                  Rankings update live as players finish attempts.{" "}
                  <Link href={`/play?tournament=${tournamentId}`} className="text-cyan-300 hover:underline">
                    Join this pool
                  </Link>
                </p>
              ) : null}
            </>
          )}
        </Container>
      </main>
    </GameShell>
  );
}
