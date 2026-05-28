"use client";

import { Coins, Trophy, Users, Zap, Crown, BarChart3 } from "lucide-react";
import Link from "next/link";
import type { Tournament } from "@frx/shared";
import { DAILY_FEE_SPLIT } from "@frx/shared";
import { isJoinable, getDailyRewardDisplay } from "@/lib/tournaments";
import { Button } from "@/components/Button";

type PoolStatus = "available" | "in_progress" | "completed";

type TournamentPoolCardProps = {
  tournament: Tournament;
  creditBalance: number;
  loading?: boolean;
  poolStatus?: PoolStatus;
  qualifiedForWeekly?: boolean;
  dailyCompletions?: number;
  weeklyJackpotCredits?: number;
  onJoin: (tournamentId: string) => void;
  onConvert?: () => void;
};

function tierLabel(type: string) {
  if (type === "DAILY") return "Daily";
  if (type === "WEEKLY_JACKPOT") return "Weekly Jackpot";
  return type;
}

export function TournamentPoolCard({
  tournament,
  creditBalance,
  loading = false,
  poolStatus = "available",
  qualifiedForWeekly = false,
  dailyCompletions = 0,
  weeklyJackpotCredits,
  onJoin,
  onConvert,
}: TournamentPoolCardProps) {
  const isWeekly = tournament.type === "WEEKLY_JACKPOT";
  const joinable = isJoinable(tournament, creditBalance, {
    completed: poolStatus === "completed",
    enrolled: poolStatus !== "available",
  });
  const needsCredits =
    creditBalance < tournament.entryFeeCredits && poolStatus === "available";
  const fillPct = Math.min(
    100,
    Math.round((tournament.playerCount / tournament.maxPlayers) * 100)
  );
  const rewardPool = tournament.rewardPoolCredits ?? tournament.prizePoolCredits;
  const rewardLabel =
    tournament.type === "DAILY"
      ? getDailyRewardDisplay(tournament)
      : isWeekly && weeklyJackpotCredits != null
        ? weeklyJackpotCredits.toLocaleString()
        : rewardPool.toLocaleString();

  const weeklyBlocked =
    isWeekly && !qualifiedForWeekly && poolStatus === "available";

  return (
    <article className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
              isWeekly ? "text-amber-400" : "text-cyan-400"
            }`}
          >
            {isWeekly ? (
              <Crown className="h-3 w-3" />
            ) : (
              <Zap className="h-3 w-3" />
            )}
            {tierLabel(tournament.type)}
          </p>
          <h3 className="mt-1 text-lg font-bold text-white">{tournament.title}</h3>
        </div>
        <span
          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
            poolStatus === "completed"
              ? "border-slate-500/30 bg-slate-500/10 text-slate-400"
              : tournament.status === "CLOSED"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                : poolStatus === "in_progress"
                  ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-300"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}
        >
          {poolStatus === "completed"
            ? "Completed"
            : tournament.status === "CLOSED"
              ? "Full"
              : poolStatus === "in_progress"
                ? "In progress"
                : tournament.status}
        </span>
      </div>

      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-slate-500">
          <span>Seats</span>
          <span>
            {tournament.playerCount}/{tournament.maxPlayers}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
          <div
            className={`h-full rounded-full ${isWeekly ? "bg-amber-500" : "bg-cyan-500"}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2">
          <Coins className="mx-auto h-3.5 w-3.5 text-amber-400" />
          <dd className="mt-1 text-sm font-bold tabular-nums text-white">
            {tournament.entryFeeCredits}
          </dd>
          <dt className="text-[9px] uppercase text-slate-500">Entry</dt>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2">
          <Trophy className="mx-auto h-3.5 w-3.5 text-cyan-400" />
          <dd className="mt-1 text-sm font-bold tabular-nums text-white">
            {rewardLabel}
          </dd>
          <dt className="text-[9px] uppercase text-slate-500">Rewards</dt>
        </div>
        <div className="rounded-lg border border-white/5 bg-black/20 px-2 py-2">
          <Users className="mx-auto h-3.5 w-3.5 text-indigo-400" />
          <dd className="mt-1 text-sm font-bold tabular-nums text-white">
            {tournament.maxPlayers}
          </dd>
          <dt className="text-[9px] uppercase text-slate-500">Max</dt>
        </div>
      </dl>

      {tournament.type === "DAILY" ? (
        <p className="mt-2 text-[10px] text-slate-500">
          Split: {DAILY_FEE_SPLIT.rewards}% rewards · {DAILY_FEE_SPLIT.treasury}% treasury ·{" "}
          {DAILY_FEE_SPLIT.weeklyJackpot}% weekly jackpot (added when pool settles)
        </p>
      ) : null}

      {isWeekly ? (
        <p className="mt-2 text-xs text-slate-400">
          Live jackpot pool (includes pending daily contributions). Qualification:{" "}
          {dailyCompletions}/5 daily tournaments completed
          {qualifiedForWeekly ? (
            <span className="ml-1 text-emerald-400">· Qualified</span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-col gap-2">
        <Link
          href={`/leaderboard/${tournament.id}`}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-black/20 py-2 text-xs font-semibold text-slate-300 transition hover:border-cyan-500/30 hover:text-cyan-200"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Pool leaderboard
        </Link>
        {poolStatus === "completed" ? (
          <p className="text-center text-xs text-slate-500">
            You finished all attempts in this pool.
          </p>
        ) : poolStatus === "in_progress" ? (
          <Button
            variant="primary"
            className="w-full py-2.5 text-sm"
            disabled={loading}
            onClick={() => onJoin(tournament.id)}
          >
            {loading ? "Loading…" : "Continue playing"}
          </Button>
        ) : weeklyBlocked ? (
          <p className="text-center text-xs text-amber-300">
            Complete 5 daily tournaments to unlock weekly jackpot entry.
          </p>
        ) : needsCredits && onConvert ? (
          <>
            <Button
              variant="primary"
              className="w-full py-2.5 text-sm"
              onClick={onConvert}
            >
              Swap OKB to join
            </Button>
            <p className="text-center text-[10px] text-amber-300/90">
              Need {tournament.entryFeeCredits - creditBalance} more FRX credits
            </p>
          </>
        ) : (
          <Button
            variant="primary"
            className="w-full py-2.5 text-sm"
            disabled={loading || !joinable || tournament.status === "CLOSED"}
            onClick={() => onJoin(tournament.id)}
          >
            {loading
              ? "Joining…"
              : tournament.status === "CLOSED"
                ? "Pool full"
                : needsCredits
                  ? "Need more credits"
                  : "Join & play"}
          </Button>
        )}
      </div>
    </article>
  );
}
