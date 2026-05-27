"use client";

import { useMemo } from "react";
import { GameLayout } from "@/components/game/GameLayout";
import { GameHeader } from "@/components/game/GameHeader";
import { Tray } from "@/components/game/Tray";
import { ActionBar } from "@/components/game/ActionBar";
import { StaticPreviewTileGrid } from "@/components/landing/StaticPreviewTileGrid";
import { createInitialBoard } from "@/lib/tile-rush/board";
import type { Tile, TrayTile } from "@/lib/tile-rush/types";
import {
  getTrayMax,
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "@/lib/tile-rush/constants";

const PREVIEW_TRAY: TrayTile[] = [
  { id: "pv-1", type: 2 },
  { id: "pv-2", type: 5 },
  { id: "pv-3", type: 8 },
];

function boardForPreviewScore(all: Tile[], matchesScored: number): Tile[] {
  const removed = Math.min(matchesScored * 3, all.length);
  if (removed <= 0) return all;
  const sorted = [...all].sort(
    (a, b) =>
      b.zIndex - a.zIndex ||
      b.layer - a.layer ||
      a.col - b.col ||
      a.row - b.row ||
      a.id.localeCompare(b.id),
  );
  const drop = new Set(sorted.slice(0, removed).map((t) => t.id));
  return all.filter((t) => !drop.has(t.id));
}

export type GameScreenshotMockProps = {
  className?: string;
  role?: string;
  "aria-label"?: string;
  /** Match count (same as in-game score). */
  score?: string;
  /** Cumulative matches across finished runs (mock / hero preview). */
  totalScore?: number;
  /** Overrides board + left panel; default derives from score (3 tiles cleared per match). */
  tilesLeft?: number;
  attempt?: number;
  secondsRemaining?: number;
};

export function GameScreenshotMock({
  className = "",
  role,
  "aria-label": ariaLabel,
  score = "36",
  totalScore = 104,
  tilesLeft: tilesLeftProp,
  attempt = 1,
  secondsRemaining = ROUND_TIME_SECONDS,
}: GameScreenshotMockProps) {
  const scoreNum = Number.parseInt(score, 10);
  const safeScore = Number.isFinite(scoreNum) ? scoreNum : 0;
  const trayMax = getTrayMax(safeScore);
  const boardTiles = useMemo(() => {
    const full = createInitialBoard(1);
    return boardForPreviewScore(full, safeScore);
  }, [safeScore]);
  const tilesLeft =
    tilesLeftProp ?? boardTiles.length;

  return (
    <div
      className={`flex max-h-[min(72vh,680px)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-white/10 bg-frx-bg shadow-xl ${className}`}
      role={role}
      aria-label={ariaLabel}
    >
      <div className="flex min-h-0 min-h-[460px] flex-1 flex-col">
        <GameLayout
          header={
            <GameHeader
              score={safeScore}
              attempt={attempt}
              maxAttempts={MAX_ATTEMPTS}
              secondsRemaining={secondsRemaining}
              totalScore={totalScore}
              tilesLeft={tilesLeft}
              rewardPoolCredits={84}
              playerCount={6}
              maxPlayers={10}
              tournamentType="DAILY"
            />
          }
          center={<StaticPreviewTileGrid tiles={boardTiles} />}
          bottom={
            <div className="mx-auto flex w-full max-w-5xl items-end gap-2 sm:gap-3">
              <Tray tray={PREVIEW_TRAY} maxSlots={trayMax} compact />
              <ActionBar
                shufflesLeft={SHUFFLES_PER_RUN}
                shufflesMax={SHUFFLES_PER_RUN}
                onShuffle={() => {}}
                shuffleDisabled
                compact
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
