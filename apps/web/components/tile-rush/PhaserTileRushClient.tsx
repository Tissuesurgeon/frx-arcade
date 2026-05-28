"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase } from "@frx/game-engine/logic/types";
import type { TileRushGameHandle } from "@frx/game-engine/phaser";
import {
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
} from "@/lib/tile-rush/constants";
import { GameEndModal } from "@/components/tile-rush/GameEndModal";
import type { RunCompletePayload } from "@/components/tile-rush/tile-rush-types";
import { useGameSound } from "@/lib/hooks/useGameSound";
import { addRunScoreToTotal, readTotalScore } from "@/lib/tile-rush/storage";

const loadPhaserGame = () =>
  import("@frx/game-engine/phaser").then((m) => m.createTileRushGame);

export type PhaserTileRushClientProps = {
  sessionKey: number;
  initialAttempt?: number;
  maxAttempts?: number;
  roundTimeSeconds?: number;
  persistLifetimeScore?: boolean;
  onRunComplete?: (payload: RunCompletePayload) => void;
  onRetryRequested?: () => void;
  submitting?: boolean;
  submitComplete?: boolean;
  guestMode?: boolean;
  finishedHref?: string;
  finishedLabel?: string;
  timeUpMessage?: string;
  onTryAgain?: () => void;
  tryAgainLabel?: string;
  rewardPoolCredits?: number;
  playerCount?: number;
  maxPlayers?: number;
  tournamentType?: string;
};

export default function PhaserTileRushClient({
  sessionKey,
  initialAttempt = 1,
  maxAttempts = MAX_ATTEMPTS,
  roundTimeSeconds = ROUND_TIME_SECONDS,
  persistLifetimeScore = true,
  onRunComplete,
  onRetryRequested,
  submitting = false,
  submitComplete = false,
  guestMode = false,
  finishedHref,
  finishedLabel,
  timeUpMessage,
  onTryAgain,
  tryAgainLabel,
  rewardPoolCredits,
  playerCount,
  maxPlayers,
  tournamentType,
}: PhaserTileRushClientProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<TileRushGameHandle | null>(null);
  const finalizedAttemptRef = useRef<number | null>(null);
  const runStartedAtRef = useRef<number>(Date.now());
  const initialAttemptRef = useRef(initialAttempt);
  initialAttemptRef.current = initialAttempt;

  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [totalScore, setTotalScore] = useState(0);

  const { muted, play, toggleMute } = useGameSound();

  const recordRunIfNeeded = useCallback(
    (runScore: number, endPhase: GamePhase, attempt: number) => {
      if (finalizedAttemptRef.current === attempt) return;
      finalizedAttemptRef.current = attempt;
      if (persistLifetimeScore) {
        addRunScoreToTotal(runScore);
        setTotalScore(readTotalScore());
      }
      onRunComplete?.({
        attemptIndex: attempt,
        matches: runScore,
        durationMs: Date.now() - runStartedAtRef.current,
        phase: endPhase,
      });
    },
    [onRunComplete, persistLifetimeScore]
  );

  useEffect(() => {
    handleRef.current?.setHudProps({
      rewardPoolCredits,
      playerCount,
      maxPlayers,
      tournamentType,
      totalScore: persistLifetimeScore ? totalScore : undefined,
      persistLifetimeScore,
      soundMuted: muted,
    });
  }, [
    rewardPoolCredits,
    playerCount,
    maxPlayers,
    tournamentType,
    totalScore,
    persistLifetimeScore,
    muted,
  ]);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    let destroyed = false;

    const attempt = Math.min(
      Math.max(initialAttemptRef.current, 1),
      maxAttempts
    );

    void loadPhaserGame().then((createTileRushGame) => {
      if (destroyed || !containerRef.current) return;

      handleRef.current?.destroy();
      handleRef.current = null;

      finalizedAttemptRef.current = null;
      runStartedAtRef.current = Date.now();
      setPhase("playing");
      setScore(0);
      setCurrentAttempt(attempt);
      if (persistLifetimeScore) {
        setTotalScore(readTotalScore());
      }

      handleRef.current = createTileRushGame(
        parent,
        {
          onScoreChange: setScore,
          onPhaseChange: (p) => {
            setPhase(p);
            if (p !== "playing") {
              const state = handleRef.current?.scene.getState();
              if (state) {
                recordRunIfNeeded(state.score, p, state.attempt);
              }
            }
          },
          onAttemptChange: setCurrentAttempt,
          onTimeTick: () => {},
          onTilesLeftChange: () => {},
          onShufflesLeftChange: () => {},
          onSound: (id) => play(id),
          onToggleSound: toggleMute,
        },
        {
          initialAttempt: attempt,
          maxAttempts,
          roundTimeSeconds,
          hudProps: {
            rewardPoolCredits,
            playerCount,
            maxPlayers,
            tournamentType,
            totalScore: persistLifetimeScore ? readTotalScore() : undefined,
            persistLifetimeScore,
            soundMuted: muted,
          },
        }
      );
    });

    return () => {
      destroyed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [
    sessionKey,
    maxAttempts,
    roundTimeSeconds,
    persistLifetimeScore,
    play,
    toggleMute,
    recordRunIfNeeded,
    rewardPoolCredits,
    playerCount,
    maxPlayers,
    tournamentType,
  ]);

  useEffect(() => {
    finalizedAttemptRef.current = null;
  }, [currentAttempt]);

  const onRetry = useCallback(() => {
    if (currentAttempt >= maxAttempts) return;
    onRetryRequested?.();
  }, [currentAttempt, maxAttempts, onRetryRequested]);

  const modalOpen = phase !== "playing";
  const canRetry = currentAttempt < maxAttempts;

  return (
    <>
      <div className="h-full min-h-0">
        <div
          ref={containerRef}
          className="relative h-full min-h-[480px] w-full touch-manipulation"
        />
      </div>
      <GameEndModal
        open={modalOpen}
        kind={
          phase === "cleared"
            ? "cleared"
            : phase === "timeUp"
              ? "timeUp"
              : "gameOver"
        }
        score={score}
        canRetry={canRetry}
        onRetry={onRetry}
        submitting={submitting}
        submitComplete={submitComplete}
        guestMode={guestMode}
        finishedHref={finishedHref}
        finishedLabel={finishedLabel}
        timeUpMessage={timeUpMessage}
        onTryAgain={onTryAgain}
        tryAgainLabel={tryAgainLabel}
      />
    </>
  );
}
