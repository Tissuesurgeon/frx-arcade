"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { GamePhase } from "@frx/game-engine/logic/types";
import type { TileRushGameHandle } from "@frx/game-engine/phaser";
import { GameLayout } from "@/components/game/GameLayout";
import { GameHeader } from "@/components/game/GameHeader";
import { GameEndModal } from "@/components/tile-rush/GameEndModal";
import type { RunCompletePayload } from "@/components/tile-rush/tile-rush-types";
import { useGameSound } from "@/lib/hooks/useGameSound";
import {
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "@/lib/tile-rush/constants";
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
  const [secondsLeft, setSecondsLeft] = useState(roundTimeSeconds);
  const [tilesLeft, setTilesLeft] = useState(216);
  const [totalScore, setTotalScore] = useState(0);
  const [shufflesLeft, setShufflesLeft] = useState(SHUFFLES_PER_RUN);

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
      setSecondsLeft(roundTimeSeconds);
      setCurrentAttempt(attempt);
      setShufflesLeft(SHUFFLES_PER_RUN);
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
          onTimeTick: setSecondsLeft,
          onTilesLeftChange: setTilesLeft,
          onShufflesLeftChange: setShufflesLeft,
          onSound: (id) => play(id),
        },
        {
          initialAttempt: attempt,
          maxAttempts,
          roundTimeSeconds,
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
    recordRunIfNeeded,
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
        <GameLayout
          header={
            <GameHeader
              score={score}
              attempt={currentAttempt}
              maxAttempts={maxAttempts}
              secondsRemaining={secondsLeft}
              totalScore={persistLifetimeScore ? totalScore : undefined}
              tilesLeft={tilesLeft}
              rewardPoolCredits={rewardPoolCredits}
              playerCount={playerCount}
              maxPlayers={maxPlayers}
              tournamentType={tournamentType}
              soundMuted={muted}
              onToggleSound={toggleMute}
            />
          }
          center={
            <div
              ref={containerRef}
              className="relative h-full min-h-[360px] w-full overflow-hidden rounded-xl border border-white/10 bg-[#0a0a12]"
            />
          }
          bottom={
            <p className="pb-1 text-center text-[11px] text-slate-500">
              Tap selectable tiles · match triples · use Shuffle on the board
            </p>
          }
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
