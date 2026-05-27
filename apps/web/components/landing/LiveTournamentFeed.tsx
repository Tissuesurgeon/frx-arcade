"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { fullDailyRewardPool } from "@frx/shared";
import type { Tournament } from "@frx/shared";
import { apiFetch } from "@/lib/api";
import { useTournamentFeed } from "@/lib/hooks/useSocket";
import { useWeeklyJackpot } from "@/lib/hooks/useWeeklyJackpot";
import { Button } from "@/components/Button";
import { Clock, Coins, Crown, Trophy, Users } from "lucide-react";

function Countdown({ endsAt }: { endsAt: string }) {
  const [left, setLeft] = useState("");

  useEffect(() => {
    const tick = () => {
      const diff = new Date(endsAt).getTime() - Date.now();
      if (diff <= 0) {
        setLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setLeft(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span className="tabular-nums text-cyan-300">{left}</span>;
}

function rewardDisplay(t: Tournament): string {
  const current = t.rewardPoolCredits ?? t.prizePoolCredits;
  if (t.type === "DAILY") {
    const max = fullDailyRewardPool();
    return `${current.toLocaleString()} / ${max.toLocaleString()}`;
  }
  return current.toLocaleString();
}

export function LiveTournamentFeed() {
  const [connected, setConnected] = useState(false);
  const { weeklyJackpotCredits } = useWeeklyJackpot();

  const { data: initial } = useQuery({
    queryKey: ["tournaments"],
    queryFn: () => apiFetch<{ tournaments: Tournament[] }>("/api/tournaments"),
    refetchInterval: 30_000,
  });

  const [live, setLive] = useState<Tournament[]>(
    initial?.tournaments.filter((t) => t.type === "DAILY") ?? []
  );

  useEffect(() => {
    if (initial?.tournaments) {
      setLive(initial.tournaments.filter((t) => t.type === "DAILY"));
    }
  }, [initial]);

  useTournamentFeed(
    useCallback((feed) => {
      setConnected(true);
      setLive(feed.filter((t) => t.type === "DAILY"));
    }, [])
  );

  return (
    <section id="tournaments" className="border-t border-white/5 bg-black/20 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
              Live · Realtime
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white sm:text-3xl">
              Live Tournaments Happening Now
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 sm:text-base">
              Join active competitions, compete against players globally, and climb the
              leaderboard in real time.
            </p>
          </div>
          <span
            className={`flex items-center gap-2 text-xs ${connected ? "text-emerald-400" : "text-slate-500"}`}
          >
            <span
              className={`h-2 w-2 rounded-full ${connected ? "animate-pulse bg-emerald-400" : "bg-slate-600"}`}
            />
            {connected ? "Live feed" : "Connecting…"}
          </span>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {live.length === 0 ? (
                <p className="col-span-2 text-slate-500">
                  No open daily tournaments — the AI agent will spawn a pool shortly.
                </p>
              ) : (
                live.map((t) => (
                  <motion.div
                    key={t.id}
                    layout
                    className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
                    whileHover={{ y: -2 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-white">{t.title}</h3>
                      <span className="shrink-0 rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-cyan-300">
                        Daily
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      Entry Fee:{" "}
                      <span className="font-semibold text-amber-200">
                        {t.entryFeeCredits} FRX Credits
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="rounded-lg bg-black/30 p-2">
                        <Users className="mx-auto h-3.5 w-3.5 text-slate-400" />
                        <p className="mt-1 tabular-nums text-white">
                          {t.playerCount}/{t.maxPlayers}
                        </p>
                        <p className="text-[9px] text-slate-500">Players</p>
                      </div>
                      <div className="rounded-lg bg-black/30 p-2">
                        <Trophy className="mx-auto h-3.5 w-3.5 text-amber-400" />
                        <p className="mt-1 tabular-nums text-amber-200">
                          {rewardDisplay(t)}
                        </p>
                        <p className="text-[9px] text-slate-500">Prize Pool</p>
                      </div>
                      <div className="rounded-lg bg-black/30 p-2">
                        <Clock className="mx-auto h-3.5 w-3.5 text-cyan-400" />
                        <p className="mt-1">
                          <Countdown endsAt={t.endsAt} />
                        </p>
                        <p className="text-[9px] text-slate-500">Remaining</p>
                      </div>
                    </div>

                    <Button
                      href="/dashboard"
                      variant="primary"
                      className="mt-4 w-full py-2 text-sm"
                    >
                      Join Tournament
                    </Button>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          <motion.div
            layout
            className="flex flex-col rounded-2xl border border-amber-500/25 bg-gradient-to-br from-amber-500/10 via-transparent to-indigo-500/10 p-6 backdrop-blur-md"
          >
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-400" />
              <h3 className="text-lg font-bold text-white">Weekly Jackpot Tournament</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Every tournament contributes to the weekly jackpot pool. Compete daily,
              qualify for the finals, and battle for massive rewards.
            </p>
            <p className="mt-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Jackpot Pool
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-amber-300">
              {weeklyJackpotCredits.toLocaleString()}{" "}
              <span className="text-base font-semibold text-amber-400/80">FRX Credits</span>
            </p>
            <Button href="/dashboard" variant="primary" className="mt-6 w-full py-2.5">
              Qualify Now
            </Button>
            <Link
              href="/leaderboard"
              className="mt-3 text-center text-xs text-slate-400 underline hover:text-cyan-300"
            >
              View leaderboard
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
