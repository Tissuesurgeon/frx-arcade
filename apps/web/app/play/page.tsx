"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSignMessage } from "wagmi";
import Link from "next/link";
import { MAX_ATTEMPTS_PER_TOURNAMENT } from "@frx/shared";
import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/Button";
import {
  TileRushGame,
  type RunCompletePayload,
} from "@/components/tile-rush/TileRushGame";
import { apiFetch } from "@/lib/api";
import { formatApiError } from "@/lib/tournaments";
import { useSessionStore, useUIStore } from "@/lib/stores/session";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import type { Tournament, TournamentParticipantStatus } from "@frx/shared";

function PlayContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [runKey, setRunKey] = useState(0);
  const [runActive, setRunActive] = useState(false);
  const [attemptToPlay, setAttemptToPlay] = useState(1);
  const [attemptScores, setAttemptScores] = useState<number[]>([]);
  const [status, setStatus] = useState<string>("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitComplete, setSubmitComplete] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const { token, creditBalance, setCreditBalance } = useSessionStore();
  const { setDepositOpen } = useUIStore();
  const { signMessageAsync } = useSignMessage();
  const { isSignedIn } = useWalletAuth();

  const queryTournamentId = sp.get("tournament");

  const { data: tournamentData } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => apiFetch<{ tournaments: Tournament[] }>("/api/tournaments"),
    refetchInterval: 15_000,
  });

  const activeTournament = useMemo(() => {
    const list = tournamentData?.tournaments ?? [];
    if (queryTournamentId) {
      return list.find((t) => t.id === queryTournamentId) ?? null;
    }
    return null;
  }, [tournamentData, queryTournamentId]);

  const tournamentId = activeTournament?.id ?? null;

  const { data: participantStatus, isLoading: participantLoading } = useQuery({
    queryKey: ["participant", tournamentId, token],
    queryFn: () =>
      apiFetch<TournamentParticipantStatus>(
        `/api/tournaments/${tournamentId}/participant/me`,
        { token: token ?? undefined }
      ),
    enabled: !!token && !!tournamentId,
  });

  useEffect(() => {
    setRunActive(false);
    setRunKey(0);
    setSubmitting(false);
    setSubmitComplete(false);
    setSubmitError(null);
    setStatus("");
  }, [tournamentId]);

  useEffect(() => {
    if (participantStatus?.completed) {
      router.replace("/dashboard?completed=1");
    }
  }, [participantStatus?.completed, router]);

  const nextAttempt = useMemo(() => {
    if (!participantStatus?.enrolled) return 1;
    if (participantStatus.completed) return MAX_ATTEMPTS_PER_TOURNAMENT;
    return Math.min(
      participantStatus.attemptsUsed + 1,
      MAX_ATTEMPTS_PER_TOURNAMENT
    );
  }, [participantStatus]);

  useEffect(() => {
    if (participantStatus?.attemptScores) {
      setAttemptScores([...participantStatus.attemptScores]);
    }
  }, [participantStatus?.attemptScores]);

  const startRun = useCallback(() => {
    if (!participantStatus?.enrolled) return;
    const attempt = Math.min(
      participantStatus.attemptsUsed + 1,
      MAX_ATTEMPTS_PER_TOURNAMENT
    );
    setAttemptToPlay(attempt);
    setRunActive(true);
    setSubmitComplete(false);
    setSubmitError(null);
    setStatus("");
    setRunKey((k) => k + 1);
  }, [participantStatus]);

  const handleRetryRequested = useCallback(() => {
    if (!participantStatus?.enrolled) return;
    const attempt = Math.min(
      participantStatus.attemptsUsed + 1,
      MAX_ATTEMPTS_PER_TOURNAMENT
    );
    setAttemptToPlay(attempt);
    setSubmitComplete(false);
    setSubmitError(null);
    setRunKey((k) => k + 1);
  }, [participantStatus]);

  const handleJoinFromGate = useCallback(async () => {
    if (!token || !tournamentId || !activeTournament) return;
    setJoining(true);
    setGateError(null);
    try {
      const { balance } = await apiFetch<{ balance: number }>(
        "/api/credits/balance",
        { token }
      );
      setCreditBalance(balance);

      if (
        activeTournament.type !== "PRACTICE" &&
        balance < activeTournament.entryFeeCredits
      ) {
        setDepositOpen(true);
        throw new Error(
          `Need ${activeTournament.entryFeeCredits - balance} more FRX credits. Swap OKB first.`
        );
      }

      const joinResult = await apiFetch<{
        creditBalance?: number;
      }>("/api/tournaments/join", {
        method: "POST",
        token,
        body: JSON.stringify({ tournamentId }),
      });

      if (joinResult.creditBalance != null) {
        setCreditBalance(joinResult.creditBalance);
      }

      await queryClient.invalidateQueries({
        queryKey: ["participant", tournamentId, token],
      });
      await queryClient.invalidateQueries({ queryKey: ["tournaments"] });
      setRunActive(false);
    } catch (err) {
      setGateError(formatApiError(err));
    } finally {
      setJoining(false);
    }
  }, [
    token,
    tournamentId,
    activeTournament,
    setCreditBalance,
    setDepositOpen,
    queryClient,
  ]);

  const submitAttempt = useCallback(
    async (payload: RunCompletePayload) => {
      if (!token || !tournamentId) {
        setSubmitError("Sign in and join a pool to submit scores.");
        return false;
      }
      if (!participantStatus?.enrolled) {
        setSubmitError("Not enrolled in this tournament.");
        return false;
      }

      setSubmitError(null);
      setSubmitting(true);
      setSubmitComplete(false);
      try {
        const eventHash = btoa(
          JSON.stringify({
            attempt: payload.attemptIndex,
            matches: payload.matches,
            phase: payload.phase,
          })
        ).slice(0, 32);

        const { nonce } = await apiFetch<{ nonce: string }>("/api/scores/nonce", {
          token,
        });
        const message = [
          tournamentId,
          payload.attemptIndex,
          payload.matches,
          payload.durationMs,
          eventHash,
          nonce,
        ].join("|");
        const signature = await signMessageAsync({ message });
        const result = await apiFetch<{ totalScore: number; status: string }>(
          "/api/scores/submit",
          {
            method: "POST",
            token,
            body: JSON.stringify({
              tournamentId,
              attemptIndex: payload.attemptIndex,
              matches: payload.matches,
              durationMs: payload.durationMs,
              eventHash,
              nonce,
              signature,
            }),
          }
        );
        setStatus(`Total: ${result.totalScore} (${result.status})`);
        setAttemptScores((prev) => {
          const next = [...prev];
          next[payload.attemptIndex - 1] = payload.matches;
          return next;
        });
        await queryClient.invalidateQueries({
          queryKey: ["participant", tournamentId, token],
        });
        setSubmitComplete(true);
        return true;
      } catch (err) {
        setSubmitError(formatApiError(err));
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [token, tournamentId, participantStatus?.enrolled, signMessageAsync, queryClient]
  );

  const onRunComplete = useCallback(
    (payload: RunCompletePayload) => {
      void submitAttempt(payload);
    },
    [submitAttempt]
  );

  const total = attemptScores.reduce((a, b) => a + (b ?? 0), 0);
  const canPlay =
    !!token &&
    !!participantStatus?.enrolled &&
    !participantStatus.completed &&
    !participantLoading;

  if (!queryTournamentId) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        <p className="text-slate-400">Join a pool from the dashboard to play competitively.</p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button href="/try" variant="primary">
            Try free (no wallet)
          </Button>
          <Button href="/dashboard" variant="secondary">
            Browse pools
          </Button>
        </div>
      </div>
    );
  }

  if (!canPlay) {
    const entryFee = activeTournament?.entryFeeCredits ?? 20;
    const needsCredits =
      !!activeTournament &&
      activeTournament.type !== "PRACTICE" &&
      creditBalance < entryFee;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
        {!isSignedIn || !token ? (
          <>
            <p className="text-slate-300">Connect and sign in to join this pool.</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button href="/demo" variant="primary">
                Get started
              </Button>
              <Button href="/try" variant="secondary">
                Try free (no wallet)
              </Button>
            </div>
          </>
        ) : participantLoading || joining ? (
          <p className="text-slate-400">Checking pool entry…</p>
        ) : (
          <>
            <p className="text-lg font-semibold text-white">
              {activeTournament?.title ?? "Tournament pool"}
            </p>
            <p className="text-sm text-slate-400">
              Entry fee:{" "}
              <span className="font-semibold text-amber-300">{entryFee} FRX</span>
              {" · "}
              Your balance:{" "}
              <span className="font-semibold text-cyan-300">
                {creditBalance.toLocaleString()} FRX
              </span>
            </p>
            {needsCredits ? (
              <>
                <p className="text-sm text-amber-200">
                  You need {entryFee - creditBalance} more FRX credits to join.
                </p>
                <Button variant="primary" onClick={() => setDepositOpen(true)}>
                  Swap OKB → FRX
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                disabled={joining || !activeTournament}
                onClick={() => void handleJoinFromGate()}
              >
                {joining ? "Joining…" : `Join pool (${entryFee} FRX)`}
              </Button>
            )}
            {gateError ? (
              <p className="max-w-md text-sm text-red-300">{gateError}</p>
            ) : null}
            <Link href="/dashboard" className="text-sm text-slate-400 underline hover:text-slate-300">
              Back to dashboard
            </Link>
          </>
        )}
      </div>
    );
  }

  const showTournamentStatus = !!status || !!submitError;

  if (!runActive) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        {activeTournament ? (
          <div className="pointer-events-auto shrink-0 border-b border-white/5 bg-black/20 px-3 py-1.5 text-center text-xs text-slate-300">
            <span className="font-semibold text-white">{activeTournament.title}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-amber-300/90">
              {activeTournament.entryFeeCredits} FRX paid
            </span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-cyan-300/90">
              {creditBalance.toLocaleString()} FRX
            </span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-emerald-400/90">
              Attempt {nextAttempt}/{MAX_ATTEMPTS_PER_TOURNAMENT}
            </span>
          </div>
        ) : null}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-white">
            {activeTournament?.title ?? "Tournament pool"}
          </p>
          <p className="text-sm text-slate-400">
            Attempt {nextAttempt} of {MAX_ATTEMPTS_PER_TOURNAMENT}
            {total > 0 ? (
              <>
                {" · "}
                <span className="text-cyan-300">Total score: {total}</span>
              </>
            ) : null}
          </p>
          <Button variant="primary" onClick={startRun}>
            Start game
          </Button>
          <Link href="/dashboard" className="text-sm text-slate-400 underline hover:text-slate-300">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {activeTournament || showTournamentStatus ? (
        <div
          className={`pointer-events-auto shrink-0 border-b px-3 py-1.5 text-center text-xs ${
            submitError
              ? "border-red-500/20 bg-red-950/40 text-red-300"
              : "border-white/5 bg-black/20 text-slate-300"
          }`}
        >
          {activeTournament ? (
            <>
              <span className="font-semibold text-white">{activeTournament.title}</span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-amber-300/90">
                {activeTournament.entryFeeCredits} FRX paid
              </span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-cyan-300/90">
                {creditBalance.toLocaleString()} FRX
              </span>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-emerald-400/90">
                Attempt {attemptToPlay}/{MAX_ATTEMPTS_PER_TOURNAMENT}
              </span>
            </>
          ) : null}
          {submitError ? (
            <>
              {activeTournament ? (
                <span className="mx-1.5 text-slate-600">·</span>
              ) : null}
              <span>{submitError}</span>
            </>
          ) : null}
          {status && !submitError ? (
            <>
              {activeTournament ? (
                <span className="mx-1.5 text-slate-600">·</span>
              ) : null}
              <span className="text-cyan-300/90">
                Total {total} · {status}
              </span>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        <TileRushGame
          sessionKey={runKey}
          initialAttempt={attemptToPlay}
          onRunComplete={onRunComplete}
          onRetryRequested={handleRetryRequested}
          submitting={submitting}
          submitComplete={submitComplete}
          rewardPoolCredits={
            activeTournament?.rewardPoolCredits ??
            activeTournament?.prizePoolCredits
          }
          playerCount={activeTournament?.playerCount}
          maxPlayers={activeTournament?.maxPlayers}
          tournamentType={activeTournament?.type}
        />
      </div>
    </div>
  );
}

export default function PlayPage() {
  return (
    <GameShell fixedViewport minimalHeader>
      <div className="flex h-full min-h-0 flex-col">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center p-8 text-slate-400">
              Loading…
            </div>
          }
        >
          <PlayContent />
        </Suspense>
      </div>
    </GameShell>
  );
}
