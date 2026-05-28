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

const DISPLAY_SLOTS = TRAY_MAX_EASY;

export function Tray({ tray, maxSlots, compact = false }: GameTrayProps) {
  const reduceMotion = useReducedMotion();
  const warnThreshold = Math.max(1, maxSlots - 2);
  const danger = tray.length >= warnThreshold;

  const tileClass = compact
    ? "flex h-full w-full items-center justify-center rounded-lg border font-mono text-xs font-bold tabular-nums leading-none shadow-md sm:text-xs"
    : "flex h-full w-full items-center justify-center rounded-xl border font-mono text-sm font-bold tabular-nums leading-none shadow-lg sm:text-base";

  return (
    <div className="min-w-0 flex-1">
      <motion.div
        animate={
          danger
            ? {
                boxShadow: [
                  "0 0 0 1px rgba(255, 70, 85, 0.55)",
                  "0 0 28px 6px rgba(255, 70, 85, 0.35)",
                  "0 0 0 1px rgba(255, 70, 85, 0.55)",
                ],
              }
            : {
                boxShadow: "0 0 0 1px rgba(38, 208, 255, 0.12)",
              }
        }
        transition={
          danger
            ? { duration: 1.1, repeat: Infinity, ease: "easeInOut" }
            : { duration: 0.25 }
        }
        className={
          compact
            ? `relative overflow-hidden rounded-xl px-2 py-2 sm:px-3 sm:py-2.5 ${
                danger
                  ? "border border-[#ff4655]/50 bg-[#1a0a0c]/90"
                  : "border border-[#26d0ff]/20 bg-[#0f1923]/95"
              }`
            : `relative overflow-hidden rounded-2xl border p-3 sm:rounded-3xl sm:p-4 ${
                danger
                  ? "border-[#ff4655]/55 bg-[#1a0a0c]/90"
                  : "border-[#26d0ff]/25 bg-[#0f1923]/95"
              }`
        }
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-[2px] w-16 bg-gradient-to-r from-[#ff4655] to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute bottom-0 right-0 h-[2px] w-16 bg-gradient-to-l from-[#26d0ff] to-transparent"
          aria-hidden
        />

        <p className="mb-1.5 hidden font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#8b9bb4] sm:mb-2 sm:block">
          Collection · {tray.length}/{maxSlots}
        </p>
        <p className="mb-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8b9bb4] sm:hidden">
          Tray · {tray.length}/{maxSlots}
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
                    data-tray-slot={slotIndex}
                    className="aspect-[4/5] max-h-full w-full max-w-[56px] place-self-center rounded-lg border border-dashed border-[#26d0ff]/20 bg-black/40 shadow-inner sm:max-w-[52px]"
                    style={{ gridColumn: slotIndex + 1, gridRow: 1 }}
                    aria-hidden
                  />
                );
              }

              const paint = tileFacePaint(tile.type);
              return (
                <motion.div
                  key={tile.id}
                  data-tray-slot={slotIndex}
                  layout="position"
                  layoutId={`tile-rush-${tile.id}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0, scale: 0.8, transition: { duration: 0.12 } }
                      : tileMatchExit
                  }
                  transition={tileLayoutTransition}
                  whileHover={{ scale: 1.06, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  className={`${tileClass} aspect-[4/5] max-h-full w-full max-w-[56px] place-self-center sm:max-w-[52px]`}
                  style={{
                    gridColumn: slotIndex + 1,
                    gridRow: 1,
                    background: paint.background,
                    borderColor: paint.borderColor,
                    borderBottomColor: paint.borderBottomColor,
                    color: paint.color,
                    boxShadow: `${paint.boxShadow}, 0 0 12px rgba(38, 208, 255, 0.15)`,
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
            <p className="flex items-center justify-center gap-1 text-center font-mono text-[10px] font-semibold uppercase tracking-wide text-[#ff4655] sm:text-xs">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Tray critical
            </p>
          ) : null}
        </div>
      </motion.div>
    </div>
  );
}
