"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { GamePhase } from "@frx/game-engine";
import type { GameEvent, TileRushGameHandle } from "@frx/game-engine";

const createGame = () =>
  import("@frx/game-engine").then((m) => m.createTileRushGame);

type PhaserTileRushProps = {
  tournamentId?: string;
  onRunEnd?: (payload: {
    score: number;
    phase: GamePhase;
    attempt: number;
    events: GameEvent[];
  }) => void;
};

function PhaserTileRushInner({ tournamentId, onRunEnd }: PhaserTileRushProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<TileRushGameHandle | null>(null);
  const eventsRef = useRef<GameEvent[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !containerRef.current) return;
    let destroyed = false;

    void createGame().then((createTileRushGame) => {
      if (destroyed || !containerRef.current) return;
      handleRef.current = createTileRushGame(containerRef.current, {
        onEvent: (ev) => {
          eventsRef.current.push(ev);
        },
        onPhaseChange: (phase) => {
          if (phase !== "playing") {
            const state = handleRef.current?.scene.getState();
            onRunEnd?.({
              score: state?.score ?? 0,
              phase,
              attempt: state?.attempt ?? 1,
              events: [...eventsRef.current],
            });
            eventsRef.current = [];
          }
        },
      });
    });

    return () => {
      destroyed = true;
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [mounted, onRunEnd, tournamentId]);

  return (
    <div
      ref={containerRef}
      className="relative h-[min(72vh,680px)] min-h-[480px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12]"
    />
  );
}

export const PhaserTileRush = dynamic(
  () => Promise.resolve(PhaserTileRushInner),
  { ssr: false, loading: () => (
    <div className="flex h-[480px] items-center justify-center rounded-2xl border border-white/10 bg-black/40 text-slate-400">
      Loading Tile Rush…
    </div>
  ) }
);
