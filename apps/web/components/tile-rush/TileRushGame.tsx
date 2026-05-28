"use client";

import dynamic from "next/dynamic";

export type { RunCompletePayload } from "./tile-rush-types";

const GameLoading = () => (
  <div className="flex h-full min-h-[480px] items-center justify-center rounded-xl border border-white/10 bg-black/40 text-slate-400">
    Loading Tile Rush…
  </div>
);

/** Full-viewport Phaser 3 client — React UI parity, loaded client-side only. */
export const TileRushGame = dynamic(
  () => import("./PhaserTileRushClient"),
  { ssr: false, loading: GameLoading }
);

export { TileRushGame as PhaserTileRush };
