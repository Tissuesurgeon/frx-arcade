"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GamePhase } from "@frx/game-engine/logic/types";
import type { TrayTile } from "@frx/game-engine/logic/types";
import type { TileRushGameHandle } from "@frx/game-engine/phaser";
import {
  getTrayMax,
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "@/lib/tile-rush/constants";
import { GameLayout } from "@/components/game/GameLayout";
import { GameHeader } from "@/components/game/GameHeader";
import { ActionBar } from "@/components/game/ActionBar";
import { Tray } from "@/components/game/Tray";
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
  const trayRef = useRef<HTMLDivElement>(null);
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
  const [tray, setTray] = useState<TrayTile[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [shufflesLeft, setShufflesLeft] = useState(SHUFFLES_PER_RUN);

  const { muted, play, toggleMute } = useGameSound();
  const trayMax = useMemo(() => getTrayMax(score), [score]);
  const boardDisabled = phase !== "playing";

  const getTrayTarget = useCallback((slotIndex: number) => {
    const canvas = containerRef.current;
    const trayRoot = trayRef.current;
    if (!canvas || !trayRoot) return null;

    const slot = trayRoot.querySelector<HTMLElement>(
      `[data-tray-slot="${slotIndex}"]`
    );
    if (!slot) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();

    return {
      x: slotRect.left + slotRect.width / 2 - canvasRect.left,
      y: slotRect.top + slotRect.height / 2 - canvasRect.top,
    };
  }, []);

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
      setTray([]);
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
          onTrayChange: setTray,
          onShufflesLeftChange: setShufflesLeft,
          onSound: (id) => play(id),
          getTrayTarget,
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
    getTrayTarget,
  ]);

  useEffect(() => {
    finalizedAttemptRef.current = null;
  }, [currentAttempt]);

  const onRetry = useCallback(() => {
    if (currentAttempt >= maxAttempts) return;
    onRetryRequested?.();
  }, [currentAttempt, maxAttempts, onRetryRequested]);

  const onShuffle = useCallback(() => {
    handleRef.current?.shuffleBoard();
  }, []);

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
              className="relative h-full min-h-[280px] w-full touch-manipulation sm:min-h-[360px]"
            />
          }
          bottom={
            <div
              ref={trayRef}
              className="mx-auto flex w-full max-w-5xl items-end gap-2 sm:gap-3"
            >
              <Tray tray={tray} maxSlots={trayMax} compact />
              <ActionBar
                shufflesLeft={shufflesLeft}
                shufflesMax={SHUFFLES_PER_RUN}
                onShuffle={onShuffle}
                shuffleDisabled={boardDisabled}
                compact
              />
            </div>
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
