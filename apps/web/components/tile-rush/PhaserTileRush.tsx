"use client";

import dynamic from "next/dynamic";

export type { RunCompletePayload } from "./tile-rush-types";

const GameLoading = () => (
  <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400">
    Loading Tile Rush…
  </div>
);

/** Phaser 3 game — loaded only in the browser (no SSR). */
export const PhaserTileRush = dynamic(
  () => import("./PhaserTileRushClient"),
  { ssr: false, loading: GameLoading }
);

/** Primary game client — Phaser 3 canvas with React HUD + end modal. */
export const TileRushGame = PhaserTileRush;
