"use client";

import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { DAILY_ENTRY_FEE, DAILY_FEE_SPLIT, DAILY_MAX_PLAYERS } from "@frx/shared";

export function EconomySection() {
  return (
    <Reveal>
      <SectionShell className="border-t border-white/5 py-12 sm:py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-8 backdrop-blur-md sm:px-10">
          <h2 className="text-center text-xl font-bold tracking-tight text-white sm:text-2xl">
            Two-layer tournament economy
          </h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
              <p className="text-xs font-bold uppercase text-cyan-300">Daily</p>
              <p className="mt-2 text-sm text-slate-300">
                {DAILY_MAX_PLAYERS} players · {DAILY_ENTRY_FEE} FRX (~$1) ·{" "}
                {DAILY_FEE_SPLIT.rewards}/{DAILY_FEE_SPLIT.treasury}/
                {DAILY_FEE_SPLIT.weeklyJackpot} split
              </p>
            </div>
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
              <p className="text-xs font-bold uppercase text-amber-300">Weekly jackpot</p>
              <p className="mt-2 text-sm text-slate-300">
                10 FRX entry · funded only by settled daily pools (10% slice) · qualify after 5
                daily tournaments
              </p>
            </div>
          </div>
          <p className="mt-6 text-center text-sm text-slate-400">
            OKB swaps mint FRX credits via the V4 hook. Daily tournament entry fees fund rewards,
            platform treasury, and the live weekly jackpot pool.
          </p>
        </div>
      </SectionShell>
    </Reveal>
  );
}
