"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { Tile as TileModel } from "@/lib/tile-rush/types";
import { tileFacePaint, tileLabel } from "@/lib/tile-rush/tile-styles";
import {
  MOBILE_LAYER_OFFSET_X_PCT,
  MOBILE_LAYER_OFFSET_Y_PCT,
  MOBILE_TILE_ASPECT,
} from "@/lib/tile-rush/constants";
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
  font-mono text-sm font-bold tabular-nums leading-none tracking-tight
  sm:text-[clamp(0.6rem,calc(2.6vmin+0.35rem),1.3rem)]
  touch-manipulation select-none
`;

const tileFaceClass = `${gameTileFaceClass} absolute`;

type TileProps = {
  tile: TileModel;
  selectable: boolean;
  disabled: boolean;
  onTap: () => void;
  mobilePresentation?: boolean;
};

export function Tile({
  tile,
  selectable,
  disabled,
  onTap,
  mobilePresentation = false,
}: TileProps) {
  const reduceMotion = useReducedMotion();
  const label = tileLabel(tile.type);
  const paint = tileFacePaint(tile.type);
  const dVar = "var(--tile-d, 12%)";
  const interactive = selectable && !disabled;

  const layerX = mobilePresentation ? tile.layer * MOBILE_LAYER_OFFSET_X_PCT : 0;
  const layerY = mobilePresentation ? tile.layer * MOBILE_LAYER_OFFSET_Y_PCT : 0;
  const layerDepthShadow = mobilePresentation
    ? `, ${2 + tile.layer * 2}px ${4 + tile.layer * 3}px ${6 + tile.layer * 2}px rgba(0,0,0,${0.28 + tile.layer * 0.06})`
    : tile.layer > 0
      ? `, 0 0 0 ${1 + tile.layer}px rgba(99, 102, 241, 0.32)`
      : "";

  return (
    <motion.button
      type="button"
      layoutId={`tile-rush-${tile.id}`}
      aria-disabled={!interactive}
      tabIndex={interactive ? 0 : -1}
      onClick={() => interactive && onTap()}
      className={`${tileFaceClass} ${
        interactive ? "cursor-pointer" : "cursor-default"
      } ${
        mobilePresentation
          ? interactive
            ? "opacity-100 ring-1 ring-white/40"
            : "opacity-[0.42] saturate-[0.65]"
          : interactive
            ? ""
            : "opacity-[0.5]"
      } ${mobilePresentation && interactive ? "before:absolute before:-inset-2 before:content-['']" : ""}`}
      style={{
        left: `${tile.xNorm * 100}%`,
        top: `${tile.yNorm * 100}%`,
        transform: `translate(calc(-50% + ${layerX}%), calc(-50% + ${layerY}%))`,
        width: dVar,
        aspectRatio: mobilePresentation ? String(MOBILE_TILE_ASPECT) : "1",
        zIndex: tile.zIndex,
        background: paint.background,
        borderColor: paint.borderColor,
        borderBottomColor: paint.borderBottomColor,
        color: paint.color,
        boxShadow: `${paint.boxShadow}${layerDepthShadow}`,
        borderRadius: mobilePresentation ? "0.45rem" : undefined,
      }}
      initial={false}
      exit={
        reduceMotion
          ? { opacity: 0, transition: { duration: 0.12 } }
          : { opacity: 0.85, scale: 0.92, transition: { duration: 0.1 } }
      }
      whileHover={
        interactive && !reduceMotion && !mobilePresentation
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
        className={`select-none ${mobilePresentation ? "text-base font-extrabold" : ""}`}
        style={{ textShadow: paint.textShadow }}
      >
        {label}
      </span>
      <span className="sr-only">Tile {label}, match three to clear</span>
    </motion.button>
  );
}
