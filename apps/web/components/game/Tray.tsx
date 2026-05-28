"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import type { TrayTile } from "@/lib/tile-rush/types";
import { TRAY_MAX_EASY } from "@/lib/tile-rush/constants";
import { tileFacePaint, tileLabel } from "@/lib/tile-rush/tile-styles";
import {
  tileLayoutTransition,
  tileMatchExit,
} from "@/lib/tile-rush/motion";

type GameTrayProps = {
  tray: TrayTile[];
  maxSlots: number;
  compact?: boolean;
};

/** Fixed column count so tray width never shifts (9 early-game cap). */
const DISPLAY_SLOTS = TRAY_MAX_EASY;

export function Tray({ tray, maxSlots, compact = false }: GameTrayProps) {
  const reduceMotion = useReducedMotion();
  const warnThreshold = Math.max(1, maxSlots - 2);
  const danger = tray.length >= warnThreshold;

  const tileClass = compact
    ? "flex h-full w-full items-center justify-center rounded-md border border-solid border-b-[2px] font-mono text-xs font-bold tabular-nums leading-none sm:rounded-lg sm:text-xs"
    : "flex h-full w-full items-center justify-center rounded-lg border border-solid border-b-[3px] font-mono text-sm font-bold tabular-nums leading-none sm:text-base";

  return (
    <div className="min-w-0 flex-1">
      <motion.div
        animate={
          danger
            ? {
                boxShadow: [
                  "0 0 0 1px rgba(248, 113, 113, 0.45)",
                  "0 0 22px 4px rgba(239, 68, 68, 0.35)",
                  "0 0 0 1px rgba(248, 113, 113, 0.45)",
                ],
              }
            : undefined
        }
        transition={
          danger
            ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.2 }
        }
        className={
          compact
            ? `rounded-xl px-0 py-0 sm:border sm:px-3 sm:py-2.5 ${
                danger
                  ? "sm:border-red-500/45 sm:bg-red-950/20"
                  : "sm:border-white/10 sm:bg-white/[0.04]"
              }`
            : `rounded-2xl border p-3 sm:rounded-3xl sm:p-4 ${
                danger
                  ? "border-red-500/50 bg-red-950/25"
                  : "border-white/10 bg-white/5"
              }`
        }
      >
        <p className="mb-1.5 hidden text-xs font-semibold tabular-nums text-slate-400 sm:mb-2 sm:block">
          Tray · {tray.length}/{maxSlots}
        </p>
        <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 sm:hidden">
          Collection · {tray.length}/{maxSlots}
        </p>

        <div
          className="mx-auto grid h-[48px] w-full items-center gap-1 sm:h-[54px] sm:gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${DISPLAY_SLOTS}, minmax(0, 1fr))`,
            maxWidth: compact ? "100%" : "42rem",
          }}
        >
          <AnimatePresence mode="popLayout" initial={false}>
            {Array.from({ length: maxSlots }, (_, slotIndex) => {
              const tile = tray[slotIndex];
              if (!tile) {
                return (
                  <div
                    key={`empty-${slotIndex}`}
                    className="aspect-[4/5] max-h-full w-full max-w-[56px] place-self-center rounded-md border border-dashed border-white/15 bg-black/25 sm:max-w-[52px] sm:rounded-lg"
                    style={{ gridColumn: slotIndex + 1, gridRow: 1 }}
                    aria-hidden
                  />
                );
              }

              const paint = tileFacePaint(tile.type);
              return (
                <motion.div
                  key={tile.id}
                  layout="position"
                  layoutId={`tile-rush-${tile.id}`}
                  initial={false}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0, transition: { duration: 0.12 } }
                      : tileMatchExit
                  }
                  transition={tileLayoutTransition}
                  className={`${tileClass} aspect-[4/5] max-h-full w-full max-w-[56px] place-self-center sm:max-w-[52px]`}
                  style={{
                    gridColumn: slotIndex + 1,
                    gridRow: 1,
                    background: paint.background,
                    borderColor: paint.borderColor,
                    borderBottomColor: paint.borderBottomColor,
                    color: paint.color,
                    boxShadow: paint.boxShadow,
                  }}
                  aria-hidden
                >
                  <span style={{ textShadow: paint.textShadow }}>
                    {tileLabel(tile.type)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="mt-1 min-h-[16px] sm:mt-2 sm:min-h-[20px]">
          {danger ? (
            <p className="flex items-center justify-center gap-1 text-center text-[11px] font-semibold text-red-400 sm:text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Tray almost full!
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
