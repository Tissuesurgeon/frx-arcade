"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LayoutGroup, MotionConfig } from "framer-motion";
import { GameLayout } from "@/components/game/GameLayout";
import { GameHeader } from "@/components/game/GameHeader";
import { TileGrid } from "@/components/game/TileGrid";
import { Tray } from "@/components/game/Tray";
import { ActionBar } from "@/components/game/ActionBar";
import { GameEndModal } from "@/components/tile-rush/GameEndModal";
import {
  addTileToTrayGrouped,
  createInitialBoard,
  getSelectableTileIds,
  isTrayStuck,
  resolveTriples,
  shuffleBoardTileTypes,
} from "@/lib/tile-rush/board";
import type { GamePhase, Tile, TrayTile } from "@/lib/tile-rush/types";
import {
  getTrayMax,
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "@/lib/tile-rush/constants";
import { addRunScoreToTotal, readTotalScore } from "@/lib/tile-rush/storage";
import { tileLayoutTransition, MATCH_CLEAR_MS } from "@/lib/tile-rush/motion";
import { useGameSound } from "@/lib/hooks/useGameSound";

export type RunCompletePayload = {
  attemptIndex: number;
  matches: number;
  durationMs: number;
  phase: GamePhase;
};

type TileRushGameProps = {
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

export function TileRushGame({
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
}: TileRushGameProps) {
  /** Prevents double-counting one run if effects fire twice (e.g. Strict Mode). */
  const finalizedAttemptRef = useRef<number | null>(null);
  const runStartedAtRef = useRef<number>(Date.now());
  const resolvingTrayRef = useRef(false);
  const matchClearTimerRef = useRef<number | null>(null);
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const [boardTiles, setBoardTiles] = useState<Tile[]>(() =>
    createInitialBoard(1)
  );
  const [tray, setTray] = useState<TrayTile[]>([]);
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [secondsLeft, setSecondsLeft] = useState(roundTimeSeconds);
  const [totalScore, setTotalScore] = useState(0);
  const [shufflesLeft, setShufflesLeft] = useState(SHUFFLES_PER_RUN);
  const [shuffleTick, setShuffleTick] = useState(0);
  const initialAttemptRef = useRef(initialAttempt);
  initialAttemptRef.current = initialAttempt;
  const prevPhaseRef = useRef<GamePhase>("playing");
  const { muted, play, toggleMute } = useGameSound();

  useEffect(() => {
    const attempt = Math.min(
      Math.max(initialAttemptRef.current, 1),
      maxAttempts
    );
    setCurrentAttempt(attempt);
    setBoardTiles(createInitialBoard(attempt));
    setTray([]);
    setScore(0);
    setPhase("playing");
    setSecondsLeft(roundTimeSeconds);
    setShufflesLeft(SHUFFLES_PER_RUN);
    setShuffleTick(0);
    if (persistLifetimeScore) {
      setTotalScore(readTotalScore());
    }
    finalizedAttemptRef.current = null;
    runStartedAtRef.current = Date.now();
    resolvingTrayRef.current = false;
    prevPhaseRef.current = "playing";
    if (matchClearTimerRef.current !== null) {
      window.clearTimeout(matchClearTimerRef.current);
      matchClearTimerRef.current = null;
    }
  }, [sessionKey, maxAttempts, roundTimeSeconds]);

  useEffect(() => {
    finalizedAttemptRef.current = null;
  }, [currentAttempt]);

  useEffect(() => {
    if (!persistLifetimeScore) return;
    setTotalScore(readTotalScore());
  }, [phase, persistLifetimeScore]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => (s <= 0 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "playing") return;
    if (secondsLeft > 10 || secondsLeft <= 0) return;
    play("tick");
  }, [phase, secondsLeft, play]);

  useEffect(() => {
    if (prevPhaseRef.current === phase) return;
    if (phase === "cleared") play("cleared");
    else if (phase === "gameOver") play("gameOver");
    else if (phase === "timeUp") play("timeUp");
    prevPhaseRef.current = phase;
  }, [phase, play]);

  const recordRunIfNeeded = useCallback(
    (runScore: number, endPhase: GamePhase) => {
      if (finalizedAttemptRef.current === currentAttempt) return;
      finalizedAttemptRef.current = currentAttempt;
      if (persistLifetimeScore) {
        addRunScoreToTotal(runScore);
        setTotalScore(readTotalScore());
      }
      onRunComplete?.({
        attemptIndex: currentAttempt,
        matches: runScore,
        durationMs: Date.now() - runStartedAtRef.current,
        phase: endPhase,
      });
    },
    [currentAttempt, onRunComplete, persistLifetimeScore]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    if (secondsLeft > 0) return;
    recordRunIfNeeded(score, "timeUp");
    setPhase("timeUp");
  }, [phase, secondsLeft, score, recordRunIfNeeded]);

  const selectableIds = useMemo(
    () => getSelectableTileIds(boardTiles),
    [boardTiles]
  );

  const boardDisabled = phase !== "playing";
  const trayMax = getTrayMax(score);

  const onTileTap = useCallback(
    (tile: Tile) => {
      if (boardDisabled || resolvingTrayRef.current) return;
      const ids = getSelectableTileIds(boardTiles);
      if (!ids.has(tile.id)) return;

      const cap = getTrayMax(score);
      if (isTrayStuck(tray, cap)) {
        recordRunIfNeeded(score, "gameOver");
        setPhase("gameOver");
        return;
      }

      play("pick");

      const nextBoard = boardTiles.filter((t) => t.id !== tile.id);
      const trayWithNewTile = addTileToTrayGrouped(tray, {
        id: tile.id,
        type: tile.type,
      });
      const resolved = resolveTriples(trayWithNewTile);
      const finalTray = resolved.tray;
      const newScore = score + resolved.matches;

      setBoardTiles(nextBoard);
      setScore(newScore);

      const finishTurn = () => {
        const capAfter = getTrayMax(newScore);
        if (nextBoard.length === 0) {
          recordRunIfNeeded(newScore, "cleared");
          setPhase("cleared");
          return;
        }
        if (isTrayStuck(finalTray, capAfter)) {
          recordRunIfNeeded(newScore, "gameOver");
          setPhase("gameOver");
        }
      };

      if (resolved.matches > 0) {
        play("match");
        resolvingTrayRef.current = true;
        setTray(trayWithNewTile);
        if (matchClearTimerRef.current !== null) {
          window.clearTimeout(matchClearTimerRef.current);
        }
        matchClearTimerRef.current = window.setTimeout(() => {
          matchClearTimerRef.current = null;
          setTray(finalTray);
          resolvingTrayRef.current = false;
          finishTurn();
        }, MATCH_CLEAR_MS);
        return;
      }

      setTray(finalTray);
      finishTurn();
    },
    [boardDisabled, boardTiles, tray, score, recordRunIfNeeded, play]
  );

  const onShuffle = useCallback(() => {
    if (boardDisabled || shufflesLeft <= 0 || boardTiles.length === 0) return;
    play("shuffle");
    setBoardTiles((prev) => shuffleBoardTileTypes(prev));
    setShufflesLeft((n) => n - 1);
    setShuffleTick((t) => t + 1);
  }, [boardDisabled, shufflesLeft, boardTiles.length, play]);

  const onRetry = useCallback(() => {
    if (currentAttempt >= maxAttempts) return;
    onRetryRequested?.();
  }, [currentAttempt, maxAttempts, onRetryRequested]);

  const modalOpen = phase !== "playing";
  const canRetry = currentAttempt < maxAttempts;

  return (
    <>
      <MotionConfig transition={tileLayoutTransition}>
        <LayoutGroup id="tile-rush-board">
          <div className="h-full min-h-0">
            <GameLayout
              header={
                <GameHeader
                  score={score}
                  attempt={currentAttempt}
                  maxAttempts={maxAttempts}
                  secondsRemaining={secondsLeft}
                  totalScore={persistLifetimeScore ? totalScore : undefined}
                  tilesLeft={boardTiles.length}
                  rewardPoolCredits={rewardPoolCredits}
                  playerCount={playerCount}
                  maxPlayers={maxPlayers}
                  tournamentType={tournamentType}
                  soundMuted={muted}
                  onToggleSound={toggleMute}
                />
              }
              center={
                <TileGrid
                  tiles={boardTiles}
                  selectableIds={selectableIds}
                  onTileTap={onTileTap}
                  disabled={boardDisabled}
                  shuffleTick={shuffleTick}
                />
              }
              bottom={
                <div className="mx-auto flex w-full max-w-5xl items-end gap-2 sm:gap-3">
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
        </LayoutGroup>
      </MotionConfig>
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
