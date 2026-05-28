"use client";

import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import type { Tile } from "@/lib/tile-rush/types";
import { computeMobileBoardFit, getTileDiameterNorm } from "@/lib/tile-rush/layout";
import {
  MOBILE_TILE_ASPECT,
  MOBILE_TILE_VISUAL_SCALE,
} from "@/lib/tile-rush/constants";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { Tile as TileButton } from "./Tile";

type TileGridProps = {
  tiles: Tile[];
  selectableIds: Set<string>;
  onTileTap: (tile: Tile) => void;
  disabled: boolean;
  shuffleTick?: number;
};

export function TileGrid({
  tiles,
  selectableIds,
  onTileTap,
  disabled,
  shuffleTick = 0,
}: TileGridProps) {
  const isMobile = useMediaQuery("(max-width: 639px)");
  const shell = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastShuffle = useRef(0);

  const mobileFit = useMemo(
    () =>
      computeMobileBoardFit(MOBILE_TILE_VISUAL_SCALE, MOBILE_TILE_ASPECT),
    []
  );

  const desktopTileD = `${getTileDiameterNorm() * 100}%`;

  useEffect(() => {
    if (shuffleTick <= 0) {
      lastShuffle.current = 0;
      return;
    }
    if (shuffleTick === lastShuffle.current || reduceMotion) return;
    lastShuffle.current = shuffleTick;
    void shell.start({
      scale: [1, 1.006, 1],
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], times: [0, 0.4, 1] },
    });
  }, [shuffleTick, reduceMotion, shell]);

  const sortedTiles = [...tiles].sort((a, b) => a.zIndex - b.zIndex);

  if (isMobile) {
    return (
      <div className="flex h-full w-full min-h-0 items-start justify-stretch px-1.5 pt-0.5 pb-1">
        <motion.div
          className="relative h-full w-full min-h-0 overflow-hidden rounded-xl border border-emerald-900/50"
          initial={false}
          animate={shell}
          style={{
            touchAction: "manipulation",
            background:
              "linear-gradient(180deg, hsl(158 36% 24%) 0%, hsl(160 32% 18%) 100%)",
            boxShadow: "inset 0 0 24px rgba(0,0,0,0.25)",
            ["--tile-d"]: `${mobileFit.tileDiameterPct}%`,
          } as CSSProperties}
        >
          <div className="relative h-full w-full">
            <AnimatePresence mode="popLayout">
              {sortedTiles.map((tile) => {
                const selectable = selectableIds.has(tile.id) && !disabled;
                const pos = mobileFit.mapPosition(tile.xNorm, tile.yNorm);
                return (
                  <TileButton
                    key={tile.id}
                    tile={tile}
                    selectable={selectable}
                    disabled={disabled}
                    onTap={() => onTileTap(tile)}
                    mobilePresentation
                    mobilePosition={pos}
                  />
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <div
        className="relative aspect-square h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] max-h-full max-w-full"
        style={{ ["--tile-d"]: desktopTileD } as CSSProperties}
      >
        <motion.div
          className="relative z-[1] h-full w-full overflow-hidden rounded-xl border border-white/10 bg-frx-bg/90 sm:rounded-2xl lg:rounded-3xl"
          initial={false}
          animate={shell}
          style={{ touchAction: "manipulation" }}
        >
          <div className="relative box-border h-full w-full p-2 md:p-2.5">
            <div className="relative h-full min-h-0 w-full min-w-0">
              <AnimatePresence mode="popLayout">
                {sortedTiles.map((tile) => {
                  const selectable = selectableIds.has(tile.id) && !disabled;
                  return (
                    <TileButton
                      key={tile.id}
                      tile={tile}
                      selectable={selectable}
                      disabled={disabled}
                      onTap={() => onTileTap(tile)}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
