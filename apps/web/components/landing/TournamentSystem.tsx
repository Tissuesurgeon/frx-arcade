"use client";

import { Crown } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { Button } from "@/components/Button";
import { useWeeklyJackpot } from "@/lib/hooks/useWeeklyJackpot";
import {
  WEEKLY_ENTRY_FEE,
  WEEKLY_QUALIFICATION_DAILY_COMPLETIONS,
} from "@frx/shared";

const features = [
  "Funded by Tournament Activity",
  "Hook-Powered Prize Growth",
  "AI-Optimized Reward Scaling",
  "Limited Qualification Slots",
  "Massive Competitive Payouts",
] as const;

export function TournamentSystem() {
  const { weeklyJackpotCredits } = useWeeklyJackpot();

  return (
    <Reveal>
      <SectionShell id="weekly-jackpot" className="border-t border-white/5 bg-white/[0.02]">
        <div className="mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-2">
            <Crown className="h-6 w-6 text-amber-400" />
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Weekly Jackpot Tournament
            </h2>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-slate-400">
            Daily tournaments feed into one massive weekly jackpot pool. Compete consistently,
            qualify for the finals, and battle for the biggest rewards on the platform.
          </p>

          <p className="mt-8 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Current Jackpot Pool
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-amber-300 sm:text-5xl">
            {weeklyJackpotCredits.toLocaleString()}{" "}
            <span className="text-xl font-semibold text-amber-400/80">FRX Credits</span>
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {WEEKLY_ENTRY_FEE} FRX entry · qualify after{" "}
            {WEEKLY_QUALIFICATION_DAILY_COMPLETIONS} daily tournaments
          </p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-3xl gap-3 sm:grid-cols-2">
          {features.map((feature) => (
            <li
              key={feature}
              className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-slate-300"
            >
              {feature}
            </li>
          ))}
        </ul>

        <div className="mt-10 text-center">
          <Button href="/dashboard" variant="primary" className="px-8 py-3">
            Enter Weekly Jackpot
          </Button>
        </div>
      </SectionShell>
    </Reveal>
  );
}
