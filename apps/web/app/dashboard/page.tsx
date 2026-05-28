"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance } from "wagmi";
import { formatEther } from "viem";
import type { Tournament, TournamentParticipantStatus } from "@frx/shared";
import { GameShell } from "@/components/game/GameShell";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { TournamentPoolCard } from "@/components/tournament/TournamentPoolCard";
import { SeasonBanner } from "@/components/tournament/SeasonBanner";
import { apiFetch } from "@/lib/api";
import { usePoolOnboarding } from "@/lib/hooks/usePoolOnboarding";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useWeeklyJackpot } from "@/lib/hooks/useWeeklyJackpot";
import { useTournamentFeedLive } from "@/lib/hooks/useSocket";
import { xLayer } from "@/lib/wagmi/config";
import { useSessionStore } from "@/lib/stores/session";
import { getPoolStatus, getVisibleDailyPools } from "@/lib/tournaments";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const { creditBalance, token } = useSessionStore();
  const { isSignedIn, wallet } = useWalletAuth();
  const { address } = useAccount();
  const { loading, error, joinPool, openDeposit, openWithdraw, clearError } =
    usePoolOnboarding();

  useEffect(() => {
    setMounted(true);
  }, []);

  const walletAddress =
    isSignedIn && mounted ? (address ?? (wallet as `0x${string}` | undefined)) : undefined;

  const { data: okbBalance, isLoading: okbLoading } = useBalance({
    address: walletAddress,
    chainId: xLayer.id,
  });

  const okbDisplay =
    okbBalance != null
      ? Number(formatEther(okbBalance.value)).toFixed(4)
      : "0.0000";

  const { data, isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => apiFetch<{ tournaments: Tournament[] }>("/api/tournaments"),
    refetchInterval: 15_000,
  });

  const [liveTournaments, setLiveTournaments] = useState<Tournament[] | null>(
    null
  );

  const onTournamentFeed = useCallback((feed: Tournament[]) => {
    setLiveTournaments(feed.filter((t) => t.type !== "PRACTICE"));
  }, []);

  useTournamentFeedLive(data?.tournaments, onTournamentFeed);

  const { data: participationsData } = useQuery({
    queryKey: ["participations", token],
    queryFn: () =>
      apiFetch<{
        participations: (TournamentParticipantStatus & { tournamentId: string })[];
      }>("/api/tournaments/participations/me", { token: token ?? undefined }),
    enabled: !!token,
  });

  const { data: qualification } = useQuery({
    queryKey: ["qualification", token],
    queryFn: () =>
      apiFetch<{ dailyCompletions: number; qualified: boolean }>(
        "/api/tournaments/qualification/me",
        { token: token ?? undefined }
      ),
    enabled: !!token,
  });

  const { weeklyJackpotCredits } = useWeeklyJackpot();

  const { data: economy } = useQuery({
    queryKey: ["agent-economy"],
    queryFn: () =>
      apiFetch<{
        platformTreasuryCredits: number;
        openDailyPools: number;
      }>("/api/agent/economy"),
  });

  const tournaments = liveTournaments ?? data?.tournaments.filter((t) => t.type !== "PRACTICE") ?? [];
  const participations = participationsData?.participations ?? [];
  const dailyPools = getVisibleDailyPools(tournaments, participations);
  const weeklyPools = tournaments.filter((t) => t.type === "WEEKLY_JACKPOT");

  return (
    <GameShell>
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Container>
          <SeasonBanner />

          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            FRX Credits · Tournaments
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Dashboard
          </h1>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="primary" className="px-6 py-3" onClick={() => openDeposit()}>
              Swap OKB → FRX
            </Button>
            {creditBalance > 0 ? (
              <Button variant="secondary" className="px-6 py-3" onClick={() => openWithdraw()}>
                Convert FRX → OKB
              </Button>
            ) : null}
            <Button href="/demo" variant="secondary" className="px-6 py-3">
              Testnet guide
            </Button>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
              {error}
              <button type="button" className="ml-2 underline" onClick={clearError}>
                Dismiss
              </button>
            </p>
          ) : null}

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                FRX Credits
              </h2>
              <p className="mt-2 text-3xl font-bold tabular-nums text-cyan-300">
                {creditBalance.toLocaleString()}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                OKB Testnet
              </h2>
              {isSignedIn && mounted ? (
                <>
                  <p className="mt-2 text-3xl font-bold tabular-nums text-emerald-300">
                    {okbLoading ? "…" : okbDisplay}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">
                    X Layer native balance
                  </p>
                </>
              ) : (
                <>
                  <p className="mt-2 text-lg font-medium text-slate-500">—</p>
                  <p className="mt-1 text-xs text-slate-500">Connect wallet to view</p>
                </>
              )}
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Open daily pools
              </h2>
              <p className="mt-2 text-3xl font-bold tabular-nums text-white">
                {economy?.openDailyPools ?? "—"}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Weekly jackpot
              </h2>
              <p className="mt-2 text-3xl font-bold tabular-nums text-amber-300">
                {weeklyJackpotCredits.toLocaleString()}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-emerald-400/80">
                Live · from settled dailies
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Qualification
              </h2>
              <p className="mt-2 text-lg font-bold text-white">
                {qualification?.dailyCompletions ?? 0}/5 daily
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {qualification?.qualified ? "Weekly unlocked" : "Keep playing daily"}
              </p>
            </div>
          </div>

          <section className="mt-12">
            <h2 className="text-xl font-bold text-white">Daily pools</h2>
            {isLoading ? (
              <p className="mt-6 text-slate-500">Loading…</p>
            ) : dailyPools.length === 0 ? (
              <p className="mt-6 text-sm text-slate-400">
                No daily pool open — the AI agent will spawn one shortly.
              </p>
            ) : (
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {dailyPools.map((t) => (
                  <TournamentPoolCard
                    key={t.id}
                    tournament={t}
                    creditBalance={creditBalance}
                    loading={loading}
                    poolStatus={getPoolStatus(t.id, participations)}
                    onConvert={openDeposit}
                    onJoin={(id) => void joinPool(id)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-bold text-white">Weekly jackpot</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {weeklyPools.map((t) => (
                <TournamentPoolCard
                  key={t.id}
                  tournament={t}
                  creditBalance={creditBalance}
                  loading={loading}
                  poolStatus={getPoolStatus(t.id, participations)}
                  qualifiedForWeekly={qualification?.qualified}
                  dailyCompletions={qualification?.dailyCompletions}
                  weeklyJackpotCredits={weeklyJackpotCredits}
                  onConvert={openDeposit}
                  onJoin={(id) => void joinPool(id)}
                />
              ))}
            </div>
          </section>
        </Container>
      </main>
    </GameShell>
  );
}
