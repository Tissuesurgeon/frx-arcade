"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, useBalance } from "wagmi";
import { ExternalLink, Wallet } from "lucide-react";
import { GameShell } from "@/components/game/GameShell";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { TournamentPoolCard } from "@/components/tournament/TournamentPoolCard";
import { SeasonBanner } from "@/components/tournament/SeasonBanner";
import { apiFetch } from "@/lib/api";
import { usePoolOnboarding } from "@/lib/hooks/usePoolOnboarding";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useSessionStore } from "@/lib/stores/session";
import { getPoolStatus, getVisibleDailyPools, pickDefaultTournament } from "@/lib/tournaments";
import type { Tournament, TournamentParticipantStatus } from "@frx/shared";
import { DAILY_ENTRY_FEE } from "@frx/shared";
import { formatEther } from "viem";
import { xLayer } from "@/lib/wagmi/config";

const XLAYER_FAUCET_URL = "https://web3.okx.com/xlayer/faucet/xlayerfaucet";

export default function DemoPage() {
  const [mounted, setMounted] = useState(false);
  const { creditBalance, token } = useSessionStore();
  const { isSignedIn } = useWalletAuth();
  const { address } = useAccount();

  useEffect(() => {
    setMounted(true);
  }, []);

  const walletConnected = mounted && isSignedIn;
  const displayCredits = mounted && token ? creditBalance.toLocaleString() : "0";
  const { data: okbBalance } = useBalance({
    address: walletConnected ? address : undefined,
    chainId: xLayer.id,
  });
  const {
    loading,
    error,
    joinPool,
    joinCheapestPool,
    openDeposit,
    openWithdraw,
    openConnect,
    clearError,
  } = usePoolOnboarding();

  const { data, isLoading } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => apiFetch<{ tournaments: Tournament[] }>("/api/tournaments"),
  });

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
      apiFetch<{
        dailyCompletions: number;
        qualified: boolean;
        weeklyJackpotCredits: number;
      }>("/api/tournaments/qualification/me", { token: token ?? undefined }),
    enabled: !!token,
  });

  const tournaments =
    data?.tournaments.filter((t) => t.type !== "PRACTICE") ?? [];
  const participations = participationsData?.participations ?? [];
  const dailyPools = getVisibleDailyPools(tournaments, participations);
  const weeklyPools = tournaments.filter((t) => t.type === "WEEKLY_JACKPOT");
  const featured = pickDefaultTournament(dailyPools, creditBalance);

  return (
    <GameShell>
      <main className="flex-1 px-4 py-10 sm:px-6 sm:py-14">
        <Container>
          <SeasonBanner />

          <div className="mt-6 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-indigo-500/5 to-transparent p-6 sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300/90">
              X Layer Testnet
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Play Tile Rush for real FRX credits
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 sm:text-base">
              Swap testnet OKB through the FRX V4 hook ({DAILY_ENTRY_FEE} credits ≈ $1 daily
              entry), join 10-player daily pools, and qualify for the weekly jackpot.
            </p>

            <ol className="mt-8 grid gap-4 sm:grid-cols-3">
              <li className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-500">Step 1</p>
                <p className="mt-1 font-semibold text-white">Get testnet OKB</p>
                <a
                  href={XLAYER_FAUCET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Open faucet
                  <ExternalLink className="h-3 w-3" />
                </a>
                {walletConnected && okbBalance ? (
                  <p className="mt-2 text-xs text-emerald-300">
                    Balance: {Number(formatEther(okbBalance.value)).toFixed(4)} OKB
                  </p>
                ) : null}
              </li>
              <li className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-500">Step 2</p>
                <p className="mt-1 font-semibold text-white">Connect OKX Wallet</p>
                <Button
                  variant="secondary"
                  className="mt-3 w-full py-2 text-xs"
                  onClick={() => openConnect()}
                >
                  <Wallet className="mr-1 inline h-3.5 w-3.5" />
                  {walletConnected ? "Connected" : "Connect wallet"}
                </Button>
              </li>
              <li className="rounded-xl border border-white/10 bg-black/25 p-4">
                <p className="text-[10px] font-bold uppercase text-slate-500">Step 3</p>
                <p className="mt-1 font-semibold text-white">Swap OKB → FRX</p>
                <p className="mt-2 text-lg font-bold tabular-nums text-cyan-300">
                  {displayCredits} FRX
                </p>
                <Button
                  variant="primary"
                  className="mt-2 w-full py-2 text-xs"
                  onClick={() => openDeposit()}
                >
                  Swap via FRX Hook
                </Button>
                {mounted && creditBalance > 0 ? (
                  <Button
                    variant="secondary"
                    className="mt-2 w-full py-2 text-xs"
                    onClick={() => openWithdraw()}
                  >
                    Convert FRX → OKB
                  </Button>
                ) : null}
              </li>
            </ol>

            {mounted && creditBalance < DAILY_ENTRY_FEE ? (
              <p className="mt-4 text-sm text-amber-200">
                Daily entry requires {DAILY_ENTRY_FEE} FRX credits — swap OKB first.
              </p>
            ) : null}

            {featured ? (
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="primary"
                  className="px-6 py-3"
                  disabled={loading}
                  onClick={() => void joinCheapestPool()}
                >
                  {loading ? "Starting…" : `Join ${featured.title}`}
                </Button>
                <Button href="/try" variant="secondary" className="px-6 py-3">
                  Try free first
                </Button>
              </div>
            ) : (
              <div className="mt-6">
                <Button href="/try" variant="secondary" className="px-6 py-3">
                  Try free (no wallet)
                </Button>
              </div>
            )}

            {error ? (
              <p className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {error}
                <button type="button" className="ml-2 underline" onClick={clearError}>
                  Dismiss
                </button>
              </p>
            ) : null}
          </div>

          <section className="mt-10">
            <h2 className="text-xl font-bold text-white">Daily tournaments</h2>
            <p className="mt-1 text-sm text-slate-400">
              10 players · {DAILY_ENTRY_FEE} FRX entry · 70% rewards / 20% treasury / 10% weekly jackpot
            </p>
            {isLoading ? (
              <p className="mt-6 text-slate-500">Loading pools…</p>
            ) : dailyPools.length === 0 ? (
              <p className="mt-6 text-slate-500">
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
            <p className="mt-1 text-sm text-slate-400">
              10 FRX entry · complete 5 daily tournaments to qualify
            </p>
            {weeklyPools.length === 0 ? (
              <p className="mt-6 text-slate-500">Weekly jackpot opens before epoch end.</p>
            ) : (
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
                    onConvert={openDeposit}
                    onJoin={(id) => void joinPool(id)}
                  />
                ))}
              </div>
            )}
          </section>

          <div className="mt-10 flex flex-wrap gap-3 border-t border-white/10 pt-8">
            <Button href="/dashboard" variant="secondary">
              Dashboard
            </Button>
            <Button href="/leaderboard" variant="secondary">
              Leaderboard
            </Button>
          </div>
        </Container>
      </main>
    </GameShell>
  );
}
