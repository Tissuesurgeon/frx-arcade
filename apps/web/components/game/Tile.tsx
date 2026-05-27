"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Tile as TileModel } from "@/lib/tile-rush/types";
import { tileFacePaint, tileLabel } from "@/lib/tile-rush/tile-styles";
import {
  tileHoverSpring,
  tileLayoutTransition,
  tileTapSpring,
} from "@/lib/tile-rush/motion";

/** Shared layout + type; face colors come from `tileFacePaint` (inline). */
export const gameTileFaceClass = `
  flex min-h-0 min-w-0 items-center justify-center
  rounded-lg sm:rounded-xl
  border border-solid border-b-[3px] box-border
  font-mono text-[clamp(0.6rem,calc(2.6vmin+0.35rem),1.3rem)] font-bold tabular-nums leading-none tracking-tight
  touch-manipulation select-none
`;

const tileFaceClass = `${gameTileFaceClass} absolute`;

type TileProps = {
  tile: TileModel;
  selectable: boolean;
  disabled: boolean;
  onTap: () => void;
};

export function Tile({ tile, selectable, disabled, onTap }: TileProps) {
  const reduceMotion = useReducedMotion();
  const label = tileLabel(tile.type);
  const paint = tileFacePaint(tile.type);
  const dVar = "var(--tile-d, 12%)";
  const layerRing =
    tile.layer > 0
      ? `, 0 0 0 ${1 + tile.layer}px rgba(99, 102, 241, 0.32)`
      : "";
  const interactive = selectable && !disabled;

  return (
    <motion.button
      type="button"
      layoutId={`tile-rush-${tile.id}`}
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onClick={() => interactive && onTap()}
      className={`${tileFaceClass} ${
        interactive ? "cursor-pointer" : "cursor-default opacity-[0.5]"
      }`}
      style={{
        left: `${tile.xNorm * 100}%`,
        top: `${tile.yNorm * 100}%`,
        transform: "translate(-50%, -50%)",
        width: dVar,
        aspectRatio: "1",
        zIndex: tile.zIndex,
        background: paint.background,
        borderColor: paint.borderColor,
        borderBottomColor: paint.borderBottomColor,
        color: paint.color,
        boxShadow: `${paint.boxShadow}${layerRing}`,
      }}
      initial={false}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0.85, transition: { duration: 0.08 } }
      }
      whileHover={
        interactive && !reduceMotion
          ? { scale: 1.08, transition: tileHoverSpring }
          : undefined
      }
      whileTap={
        interactive && !reduceMotion
          ? { scale: 0.94, transition: tileTapSpring }
          : undefined
      }
      transition={tileLayoutTransition}
    >
      <span
        aria-hidden
        className="select-none"
        style={{ textShadow: paint.textShadow }}
      >
        {label}
      </span>
      <span className="sr-only">Tile {label}, match three to clear</span>
    </motion.button>
  );
}
