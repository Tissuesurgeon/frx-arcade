"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { GameShell } from "@/components/game/GameShell";
import { Button } from "@/components/Button";
import {
  TileRushGame,
  type RunCompletePayload,
} from "@/components/tile-rush/TileRushGame";
import {
  GUEST_MAX_ATTEMPTS,
  GUEST_ROUND_TIME_SECONDS,
} from "@/lib/tile-rush/constants";

export default function TryPage() {
  const [runKey, setRunKey] = useState(0);
  const [runActive, setRunActive] = useState(false);
  const [attemptToPlay, setAttemptToPlay] = useState(1);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [attemptScores, setAttemptScores] = useState<number[]>([]);
  const [submitComplete, setSubmitComplete] = useState(false);

  const nextAttempt = Math.min(attemptsUsed + 1, GUEST_MAX_ATTEMPTS);
  const total = attemptScores.reduce((a, b) => a + (b ?? 0), 0);
  const allAttemptsUsed = attemptsUsed >= GUEST_MAX_ATTEMPTS;

  const resetSession = useCallback(() => {
    setAttemptsUsed(0);
    setAttemptScores([]);
    setRunActive(false);
    setAttemptToPlay(1);
    setSubmitComplete(false);
    setRunKey(0);
  }, []);

  const startRun = useCallback(() => {
    setAttemptToPlay(nextAttempt);
    setRunActive(true);
    setSubmitComplete(false);
    setRunKey((k) => k + 1);
  }, [nextAttempt]);

  const handleRetryRequested = useCallback(() => {
    const attempt = Math.min(attemptsUsed + 1, GUEST_MAX_ATTEMPTS);
    setAttemptToPlay(attempt);
    setSubmitComplete(false);
    setRunKey((k) => k + 1);
  }, [attemptsUsed]);

  const onRunComplete = useCallback((payload: RunCompletePayload) => {
    setAttemptScores((prev) => {
      const next = [...prev];
      next[payload.attemptIndex - 1] = payload.matches;
      return next;
    });
    setAttemptsUsed(payload.attemptIndex);
    setSubmitComplete(true);
  }, []);

  if (!runActive && allAttemptsUsed) {
    return (
      <GameShell fixedViewport minimalHeader>
        <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-white">Practice session complete</p>
          <p className="text-sm text-slate-400">
            You used all {GUEST_MAX_ATTEMPTS} attempts · Total score:{" "}
            <span className="font-semibold text-cyan-300">{total}</span>
          </p>
          <p className="max-w-md text-sm text-slate-400">
            Connect your wallet and join a tournament pool to compete for real FRX
            rewards on the leaderboard.
          </p>
          <Button href="/demo" variant="primary">
            Play for real rewards
          </Button>
          <Button variant="secondary" onClick={resetSession}>
            Try again
          </Button>
        </div>
      </GameShell>
    );
  }

  if (!runActive) {
    return (
      <GameShell fixedViewport minimalHeader>
        <div className="flex h-full min-h-0 flex-col">
          <div className="pointer-events-auto shrink-0 border-b border-white/5 bg-black/20 px-3 py-1.5 text-center text-xs text-slate-300">
            <span className="font-semibold text-violet-300">Free try</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-slate-400">No wallet required</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-amber-300/90">2 min per run</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span className="text-emerald-400/90">
              Attempt {nextAttempt}/{GUEST_MAX_ATTEMPTS}
            </span>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-lg font-semibold text-white">Try Tile Rush</p>
            <p className="max-w-md text-sm text-slate-400">
              Practice the full game with {GUEST_MAX_ATTEMPTS} attempts and a{" "}
              {GUEST_ROUND_TIME_SECONDS / 60}-minute timer per run. Scores are local
              only — connect your wallet later to compete in tournament pools.
            </p>
            {total > 0 ? (
              <p className="text-sm text-cyan-300">Session total: {total}</p>
            ) : null}
            <Button variant="primary" onClick={startRun}>
              Start game
            </Button>
            <Link href="/demo" className="text-sm text-slate-400 underline hover:text-slate-300">
              Play for real rewards
            </Link>
          </div>
        </div>
      </GameShell>
    );
  }

  return (
    <GameShell fixedViewport>
      <div className="flex h-full min-h-0 flex-col">
        <div className="pointer-events-auto shrink-0 border-b border-white/5 bg-black/20 px-3 py-1.5 text-center text-xs text-slate-300">
          <span className="font-semibold text-violet-300">Free try</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="text-amber-300/90">2 min per run</span>
          <span className="mx-1.5 text-slate-600">·</span>
          <span className="text-emerald-400/90">
            Attempt {attemptToPlay}/{GUEST_MAX_ATTEMPTS}
          </span>
          {total > 0 ? (
            <>
              <span className="mx-1.5 text-slate-600">·</span>
              <span className="text-cyan-300/90">Total {total}</span>
            </>
          ) : null}
        </div>
        <div className="min-h-0 flex-1">
          <TileRushGame
            sessionKey={runKey}
            initialAttempt={attemptToPlay}
            maxAttempts={GUEST_MAX_ATTEMPTS}
            roundTimeSeconds={GUEST_ROUND_TIME_SECONDS}
            persistLifetimeScore={false}
            onRunComplete={onRunComplete}
            onRetryRequested={handleRetryRequested}
            submitComplete={submitComplete}
            guestMode
            finishedHref="/demo"
            finishedLabel="Play for real rewards"
            timeUpMessage="Two minutes are up — here's how many matches you scored."
            onTryAgain={resetSession}
            tournamentType="PRACTICE"
          />
        </div>
      </div>
    </GameShell>
  );
}
