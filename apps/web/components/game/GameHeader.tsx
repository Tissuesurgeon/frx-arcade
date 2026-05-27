"use client";

import type { ComponentType, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Coins, Layers, Trophy, Users } from "lucide-react";
import { fullDailyRewardPool } from "@frx/shared";

type GameHeaderProps = {
  score: number;
  attempt: number;
  maxAttempts: number;
  secondsRemaining: number;
  totalScore?: number;
  tilesLeft?: number;
  rewardPoolCredits?: number;
  playerCount?: number;
  maxPlayers?: number;
  tournamentType?: string;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StatChip({
  icon: Icon,
  iconClass,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-300">
      <Icon className={`h-3 w-3 shrink-0 ${iconClass}`} strokeWidth={1.75} />
      {children}
    </span>
  );
}

export function GameHeader({
  score,
  attempt,
  maxAttempts,
  secondsRemaining,
  totalScore,
  tilesLeft,
  rewardPoolCredits,
  playerCount,
  maxPlayers = 10,
  tournamentType,
}: GameHeaderProps) {
  const reduceMotion = useReducedMotion();
  const scoreStr = score.toLocaleString();
  const urgent = secondsRemaining <= 30 && secondsRemaining > 0;

  const maxRewardPool =
    tournamentType === "DAILY" ? fullDailyRewardPool() : (rewardPoolCredits ?? 0);
  const showPool =
    rewardPoolCredits !== undefined && tournamentType !== "PRACTICE";
  const showMax =
    tournamentType === "DAILY" && maxRewardPool > (rewardPoolCredits ?? 0);
  const showPlayers = playerCount !== undefined;

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="min-w-0 shrink-0">
          <p className="text-xs text-slate-400">Attempt</p>
          <p className="text-sm font-bold tabular-nums text-white">
            {attempt}/{maxAttempts}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center">
          <p className="text-xs text-slate-400">Matches</p>
          <motion.p
            key={score}
            className="text-2xl font-bold tabular-nums leading-none text-white sm:text-3xl"
            initial={reduceMotion ? false : { scale: 1.06 }}
            animate={{ scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "spring", stiffness: 480, damping: 28 }
            }
          >
            {scoreStr}
          </motion.p>
        </div>

        <div
          className={`flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 ${
            urgent
              ? "border-red-500/40 bg-red-950/30 text-red-300"
              : "border-white/10 bg-black/25 text-white"
          }`}
        >
          <Clock className="h-3.5 w-3.5 shrink-0 opacity-80" />
          <span className="font-mono text-sm font-semibold tabular-nums">
            {formatTime(secondsRemaining)}
          </span>
        </div>
      </div>

      {(totalScore !== undefined ||
        tilesLeft !== undefined ||
        showPool ||
        showPlayers) && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {totalScore !== undefined ? (
            <StatChip icon={Trophy} iconClass="text-amber-400">
              {totalScore.toLocaleString()} total
            </StatChip>
          ) : null}
          {tilesLeft !== undefined ? (
            <StatChip icon={Layers} iconClass="text-violet-400">
              {tilesLeft.toLocaleString()} left
            </StatChip>
          ) : null}
          {showPool ? (
            <StatChip icon={Coins} iconClass="text-amber-400">
              {rewardPoolCredits!.toLocaleString()}
              {showMax ? ` / ${maxRewardPool.toLocaleString()}` : ""} FRX
            </StatChip>
          ) : null}
          {showPlayers ? (
            <StatChip icon={Users} iconClass="text-cyan-400">
              {playerCount}/{maxPlayers}
            </StatChip>
          ) : null}
        </div>
      )}
    </div>
  );
}
