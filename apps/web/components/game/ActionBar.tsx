"use client";

import { Shuffle } from "lucide-react";
import { motion } from "framer-motion";

type ActionBarProps = {
  shufflesLeft: number;
  shufflesMax: number;
  onShuffle: () => void;
  shuffleDisabled: boolean;
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
              ? "relative flex h-12 w-12 items-center justify-center rounded-lg border border-[#26d0ff]/40 bg-gradient-to-b from-[#1a2332] to-[#0a0e14] text-[#26d0ff] shadow-[0_0_20px_rgba(38,208,255,0.2)] sm:h-16 sm:w-16"
              : "relative flex h-12 w-12 cursor-not-allowed items-center justify-center rounded-lg border border-[#8b9bb4]/20 bg-[#0f1923]/60 text-[#8b9bb4] opacity-50 sm:h-16 sm:w-16"
          }
          whileHover={shuffleActive ? { scale: 1.06, boxShadow: "0 0 28px rgba(38,208,255,0.35)" } : undefined}
          whileTap={shuffleActive ? { scale: 0.92 } : undefined}
        >
          <div className="pointer-events-none absolute left-0 top-0 h-[2px] w-6 bg-[#ff4655]" />
          <motion.span
            className="inline-flex"
            whileTap={shuffleActive ? { rotate: [0, -22, 18, 0] } : undefined}
            transition={{ duration: 0.38, ease: "easeOut" }}
          >
            <Shuffle className="h-6 w-6 sm:h-7 sm:w-7" />
          </motion.span>
          <span className="absolute -bottom-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded border border-[#ff4655]/40 bg-[#0a0e14] px-1 font-mono text-[10px] font-bold tabular-nums text-[#ff4655]">
            {shufflesLeft}
          </span>
        </motion.button>
        <p className="font-mono text-[9px] font-semibold uppercase tracking-wider text-[#8b9bb4] sm:text-[10px]">
          Shuffle
        </p>
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
              ? "relative flex min-h-[52px] min-w-[140px] items-center justify-center gap-2 rounded-lg border border-[#26d0ff]/40 bg-gradient-to-b from-[#1a2332] to-[#0a0e14] px-6 py-3 font-mono text-sm font-bold uppercase tracking-wide text-[#26d0ff] shadow-[0_0_24px_rgba(38,208,255,0.18)]"
              : "relative flex min-h-[52px] min-w-[140px] cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-[#8b9bb4]/20 bg-[#0f1923]/60 px-6 py-3 font-mono text-sm font-bold text-[#8b9bb4] opacity-50"
          }
          whileHover={shuffleActive ? { scale: 1.03 } : undefined}
          whileTap={shuffleActive ? { scale: 0.96 } : undefined}
        >
          <motion.span
            className="inline-flex shrink-0"
            whileTap={shuffleActive ? { rotate: [0, -22, 18, 0] } : undefined}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <Shuffle className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.span>
          <span>Shuffle</span>
        </motion.button>
        <p className="font-mono text-xs tabular-nums text-[#8b9bb4]">
          {shufflesLeft} / {shufflesMax}
        </p>
      </div>
    </div>
  );
}
