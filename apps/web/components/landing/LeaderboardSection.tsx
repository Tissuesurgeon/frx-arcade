"use client";

import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { Button } from "@/components/Button";

const categories = [
  "Daily Rankings",
  "Weekly Rankings",
  "Seasonal Rankings",
  "Jackpot Champions",
] as const;

export function LeaderboardSection() {
  return (
    <Reveal>
      <SectionShell id="leaderboard">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Global Rankings
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
          Compete against players worldwide and earn your place among the top competitors in
          the Frx Arcade ecosystem.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {categories.map((category) => (
            <span
              key={category}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300"
            >
              {category}
            </span>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Button href="/leaderboard" variant="primary" className="px-8 py-3">
            View Leaderboards
          </Button>
        </div>
      </SectionShell>
    </Reveal>
  );
}
