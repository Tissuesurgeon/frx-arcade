"use client";

import dynamic from "next/dynamic";

export type { RunCompletePayload } from "./tile-rush-types";

const GameLoading = () => (
  <div className="flex h-full min-h-[360px] items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400">
    Loading Tile Rush…
  </div>
);

/** Optional Phaser 3 client — not used by default; see `TileRushGame.tsx`. */
export const PhaserTileRush = dynamic(
  () => import("./PhaserTileRushClient"),
  { ssr: false, loading: GameLoading }
);
