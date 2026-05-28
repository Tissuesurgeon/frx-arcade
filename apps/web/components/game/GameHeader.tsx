"use client";

import type { ComponentType, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, Coins, Layers, Trophy, Users, Volume2, VolumeX } from "lucide-react";
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
  soundMuted?: boolean;
  onToggleSound?: () => void;
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function HudChip({
  icon: Icon,
  iconClass,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClass: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded border border-[#26d0ff]/15 bg-[#0f1923]/80 px-2 py-0.5">
      <Icon className={`h-3 w-3 shrink-0 ${iconClass}`} strokeWidth={2} />
      <span className="font-mono text-[9px] uppercase tracking-wider text-[#8b9bb4]">
        {label}
      </span>
      <span className="font-mono text-xs font-bold tabular-nums text-[#ece8e1]">
        {children}
      </span>
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
  soundMuted,
  onToggleSound,
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

  const hudShell =
    "relative overflow-hidden border border-[#ff4655]/30 bg-[#0a0e14]/90 shadow-[0_4px_24px_rgba(0,0,0,0.45)] backdrop-blur-md";

  return (
    <>
      {/* Mobile HUD */}
      <div className="sm:hidden">
        <div className={`${hudShell} rounded-lg px-2.5 py-2`}>
          <div className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-[#ff4655]" />
          <div className="pointer-events-none absolute right-0 top-0 h-[2px] w-20 bg-gradient-to-l from-[#26d0ff] to-transparent" />

          <div className="flex items-center gap-2 pl-1">
            <div className="flex shrink-0 flex-col border-r border-[#26d0ff]/15 pr-2">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#ff4655]">
                Run
              </span>
              <span className="font-mono text-sm font-bold tabular-nums text-[#ece8e1]">
                {attempt}/{maxAttempts}
              </span>
            </div>

            <div className="flex min-w-0 flex-1 flex-col items-center">
              <span className="font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-[#26d0ff]">
                Matches
              </span>
              <motion.p
                key={score}
                className="text-2xl font-black tabular-nums leading-none text-[#ece8e1]"
                initial={reduceMotion ? false : { scale: 1.12 }}
                animate={{ scale: 1 }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 520, damping: 26 }
                }
              >
                {scoreStr}
              </motion.p>
              {tilesLeft !== undefined ? (
                <span className="mt-0.5 font-mono text-[9px] font-semibold tabular-nums text-[#8b9bb4]">
                  {tilesLeft} remaining
                </span>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <div
                className={`flex items-center gap-1 rounded border px-2 py-1.5 ${
                  urgent
                    ? "border-[#ff4655]/60 bg-[#ff4655]/15"
                    : "border-[#26d0ff]/25 bg-[#0f1923]/80"
                }`}
              >
                <Clock
                  className={`h-3.5 w-3.5 ${urgent ? "text-[#ff4655]" : "text-[#26d0ff]"}`}
                />
                <span
                  className={`font-mono text-sm font-bold tabular-nums ${
                    urgent ? "text-[#ff4655]" : "text-[#ece8e1]"
                  }`}
                >
                  {formatTime(secondsRemaining)}
                </span>
              </div>
              {onToggleSound ? (
                <button
                  type="button"
                  onClick={onToggleSound}
                  aria-label={soundMuted ? "Unmute game sounds" : "Mute game sounds"}
                  className="flex h-9 w-9 items-center justify-center rounded border border-[#26d0ff]/20 bg-[#0f1923]/80 text-[#8b9bb4] transition hover:border-[#26d0ff]/40 hover:text-[#26d0ff]"
                >
                  {soundMuted ? (
                    <VolumeX className="h-4 w-4" strokeWidth={2} />
                  ) : (
                    <Volume2 className="h-4 w-4" strokeWidth={2} />
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop HUD */}
      <div className={`${hudShell} hidden rounded-lg px-4 py-2.5 sm:block`}>
        <div className="pointer-events-none absolute left-0 top-0 h-full w-[3px] bg-[#ff4655]" />
        <div className="pointer-events-none absolute right-0 top-0 h-[2px] w-28 bg-gradient-to-l from-[#26d0ff] to-transparent" />

        <div className="flex items-center gap-4 pl-1">
          <div className="min-w-0 shrink-0 border-r border-[#26d0ff]/15 pr-4">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#ff4655]">
              Attempt
            </p>
            <p className="font-mono text-lg font-bold tabular-nums text-[#ece8e1]">
              {attempt}/{maxAttempts}
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center">
            <p className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-[#26d0ff]">
              Matches
            </p>
            <motion.p
              key={score}
              className="text-4xl font-black tabular-nums leading-none text-[#ece8e1]"
              initial={reduceMotion ? false : { scale: 1.08 }}
              animate={{ scale: 1 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: "spring", stiffness: 520, damping: 26 }
              }
            >
              {scoreStr}
            </motion.p>
          </div>

          <div
            className={`flex shrink-0 items-center gap-1.5 rounded border px-3 py-1.5 ${
              urgent
                ? "border-[#ff4655]/60 bg-[#ff4655]/12 text-[#ff4655]"
                : "border-[#26d0ff]/25 bg-[#0f1923]/80 text-[#ece8e1]"
            }`}
          >
            <Clock className="h-4 w-4 shrink-0 opacity-90" />
            <span className="font-mono text-base font-bold tabular-nums">
              {formatTime(secondsRemaining)}
            </span>
          </div>

          {onToggleSound ? (
            <button
              type="button"
              onClick={onToggleSound}
              aria-label={soundMuted ? "Unmute game sounds" : "Mute game sounds"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#26d0ff]/20 bg-[#0f1923]/80 text-[#8b9bb4] transition hover:border-[#26d0ff]/40 hover:text-[#26d0ff]"
            >
              {soundMuted ? (
                <VolumeX className="h-4 w-4" strokeWidth={2} />
              ) : (
                <Volume2 className="h-4 w-4" strokeWidth={2} />
              )}
            </button>
          ) : null}
        </div>

        {(totalScore !== undefined ||
          tilesLeft !== undefined ||
          showPool ||
          showPlayers) && (
          <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2 border-t border-[#26d0ff]/10 pt-2">
            {totalScore !== undefined ? (
              <HudChip icon={Trophy} iconClass="text-[#ffc84d]" label="Total">
                {totalScore.toLocaleString()}
              </HudChip>
            ) : null}
            {tilesLeft !== undefined ? (
              <HudChip icon={Layers} iconClass="text-[#66c0f4]" label="Board">
                {tilesLeft.toLocaleString()}
              </HudChip>
            ) : null}
            {showPool ? (
              <HudChip icon={Coins} iconClass="text-[#ffc84d]" label="Pool">
                {rewardPoolCredits!.toLocaleString()}
                {showMax ? ` / ${maxRewardPool.toLocaleString()}` : ""} FRX
              </HudChip>
            ) : null}
            {showPlayers ? (
              <HudChip icon={Users} iconClass="text-[#26d0ff]" label="Players">
                {playerCount}/{maxPlayers}
              </HudChip>
            ) : null}
          </div>
        )}
      </div>
    </>
  );
}
