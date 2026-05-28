"use client";

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import type { Tile } from "@/lib/tile-rush/types";
import { getTileDiameterNorm } from "@/lib/tile-rush/layout";
import {
  MOBILE_TILE_MIN_PX,
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
  const boardRef = useRef<HTMLDivElement>(null);
  const boardPx = useBoardSize(boardRef, isMobile);
  const shell = useAnimationControls();
  const reduceMotion = useReducedMotion();
  const lastShuffle = useRef(0);

  const baseDiameter = getTileDiameterNorm();
  const scaledDiameter = baseDiameter * (isMobile ? MOBILE_TILE_VISUAL_SCALE : 1);
  const minDiameterPx =
    isMobile && boardPx > 0 ? MOBILE_TILE_MIN_PX / boardPx : 0;
  const tileDiameter = Math.max(scaledDiameter, minDiameterPx);
  const tileD = `${tileDiameter * 100}%`;

  useEffect(() => {
    if (shuffleTick <= 0) {
      lastShuffle.current = 0;
      return;
    }
    if (shuffleTick === lastShuffle.current || reduceMotion) return;
    lastShuffle.current = shuffleTick;
    void shell.start({
      scale: [1, 1.008, 1],
      transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1], times: [0, 0.4, 1] },
    });
  }, [shuffleTick, reduceMotion, shell]);

  const sortedTiles = [...tiles].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center sm:items-center">
      <div
        ref={boardRef}
        className={
          isMobile
            ? "relative aspect-square w-[min(100cqw,100%)] max-w-full shrink-0"
            : "relative aspect-square h-[min(100cqw,100cqh)] w-[min(100cqw,100cqh)] max-h-full max-w-full"
        }
        style={
          {
            ["--tile-d"]: tileD,
          } as CSSProperties
        }
      >
        <motion.div
          className="relative z-[1] h-full w-full overflow-visible rounded-xl border border-white/10 bg-frx-bg/90 sm:overflow-hidden sm:rounded-2xl lg:rounded-3xl"
          initial={false}
          animate={shell}
          style={{ touchAction: "manipulation" }}
        >
          <div className="relative box-border h-full w-full p-0.5 sm:p-2 md:p-2.5">
            <div className="relative h-full min-h-0 w-full min-w-0 overflow-visible">
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
                      enlargedTouch={isMobile}
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

function useBoardSize(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean
): number {
  const [size, setSize] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setSize(0);
      return;
    }
    const node = ref.current;
    if (!node) return;

    const update = () => {
      const rect = node.getBoundingClientRect();
      setSize(Math.min(rect.width, rect.height));
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, ref]);

  return size;
}
