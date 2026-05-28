"use client";

import { Shuffle } from "lucide-react";
import { motion } from "framer-motion";

type ActionBarProps = {
  shufflesLeft: number;
  shufflesMax: number;
  onShuffle: () => void;
  shuffleDisabled: boolean;
  /** Dock layout: circular power-up button beside tray. */
  compact?: boolean;
};

export function ActionBar({
  shufflesLeft,
  shufflesMax,
  onShuffle,
  shuffleDisabled,
  compact = false,
}: ActionBarProps) {
  const shuffleActive = shufflesLeft > 0 && !shuffleDisabled;

  if (compact) {
    return (
      <div className="flex shrink-0 flex-col items-center gap-0.5 pb-0 sm:gap-1 sm:pb-0.5">
        <motion.button
          type="button"
          disabled={!shuffleActive}
          onClick={() => shuffleActive && onShuffle()}
          aria-label={
            shuffleActive
              ? `Shuffle tiles (${shufflesLeft} uses left)`
              : shuffleDisabled
                ? "Shuffle unavailable"
                : "No shuffles left"
          }
          className={
            shuffleActive
              ? "relative flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/50 bg-gradient-to-b from-violet-500 to-violet-700 text-white shadow-lg shadow-violet-900/40 sm:h-16 sm:w-16 sm:from-violet-600 sm:to-violet-600 sm:shadow-none"
              : "relative flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500 opacity-60 sm:h-16 sm:w-16"
          }
          whileHover={shuffleActive ? { scale: 1.05 } : undefined}
          whileTap={shuffleActive ? { scale: 0.94 } : undefined}
        >
          <motion.span
            className="inline-flex"
            whileTap={shuffleActive ? { rotate: [0, -18, 14, 0] } : undefined}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <Shuffle className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/20 bg-black/80 px-1 text-[10px] font-bold tabular-nums">
            {shufflesLeft}
          </span>
        </motion.button>
        <p className="text-[10px] font-medium text-slate-500 sm:text-xs">Shuffle</p>
      </div>
    );
  }

  return (
    <div className="flex items-end justify-center">
      <div className="flex flex-col items-center gap-1.5">
        <motion.button
          type="button"
          disabled={!shuffleActive}
          onClick={() => shuffleActive && onShuffle()}
          aria-label={
            shuffleActive
              ? `Shuffle tiles (${shufflesLeft} uses left)`
              : shuffleDisabled
                ? "Shuffle unavailable"
                : "No shuffles left"
          }
          className={
            shuffleActive
              ? "relative flex min-h-[52px] min-w-[140px] items-center justify-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-600 px-6 py-3 text-sm font-bold text-white hover:bg-violet-500"
              : "relative flex min-h-[52px] min-w-[140px] cursor-not-allowed items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-slate-500 opacity-60"
          }
          whileHover={shuffleActive ? { scale: 1.04 } : undefined}
          whileTap={shuffleActive ? { scale: 0.96 } : undefined}
        >
          <motion.span
            className="inline-flex shrink-0"
            whileTap={
              shuffleActive ? { rotate: [0, -22, 18, 0] } : undefined
            }
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.span>
          <span>Shuffle</span>
        </motion.button>
        <p className="text-xs tabular-nums text-slate-400">
          {shufflesLeft} / {shufflesMax} left
        </p>
      </div>
    </div>
  );
}
