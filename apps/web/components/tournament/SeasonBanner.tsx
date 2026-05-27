"use client";

import { useQuery } from "@tanstack/react-query";
import { Calendar, Crown } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useWeeklyJackpot } from "@/lib/hooks/useWeeklyJackpot";

export function SeasonBanner() {
  const { weeklyJackpotCredits } = useWeeklyJackpot();

  const { data } = useQuery({
    queryKey: ["season-current"],
    queryFn: () =>
      apiFetch<{
        season: {
          name: string;
          endsAt: string;
        };
      }>("/api/seasons/current"),
  });

  if (!data) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(data.season.endsAt).getTime() - Date.now()) / (24 * 3600_000)
    )
  );

  return (
    <div className="rounded-2xl border border-amber-500/25 bg-gradient-to-r from-amber-500/10 to-violet-500/10 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
            <Calendar className="h-3.5 w-3.5" />
            {data.season.name}
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {daysLeft} days left in season · 10% of each settled daily pool funds
            the weekly jackpot
          </p>
        </div>
        <div className="text-right">
          <p className="flex items-center justify-end gap-1 text-xs uppercase text-slate-500">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            Weekly jackpot
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-amber-200">
            {weeklyJackpotCredits.toLocaleString()} FRX
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-emerald-400/90">
            Live · tournament pools
          </p>
        </div>
      </div>
    </div>
  );
}
