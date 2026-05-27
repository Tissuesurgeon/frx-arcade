"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/Container";
import { Button } from "@/components/Button";
import { HeroTilePreview } from "@/components/landing/HeroTilePreview";
import { useLandingStats } from "@/lib/hooks/useLandingStats";

const badges = [
  "Liquidity-Powered Tournaments",
  "AI-Managed Competition",
  "Real-Time Rewards",
  "Built on Uniswap V4 Hooks",
] as const;

function formatStat(value: number | undefined): string {
  if (value == null) return "—";
  return value.toLocaleString();
}

export function Hero() {
  const { data: stats } = useLandingStats();

  const statItems = [
    { label: "Active Players", value: formatStat(stats?.activePlayers) },
    { label: "Live Tournaments", value: formatStat(stats?.liveTournaments) },
    {
      label: "Total Rewards Distributed",
      value: formatStat(stats?.totalRewardsDistributed),
    },
    {
      label: "Weekly Jackpot Pool",
      value: formatStat(stats?.weeklyJackpotCredits),
    },
  ];

  return (
    <section className="relative overflow-hidden pt-10 pb-16 sm:pt-14 sm:pb-20 lg:pt-20 lg:pb-28">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(99,102,241,0.25),transparent)]" />
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400/90">
              Liquidity-Powered Competitive Gaming on X Layer
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Play. Compete. Earn.
            </h1>
            <p className="mt-2 text-lg font-medium text-slate-300 sm:text-xl">
              Where Programmable Liquidity Becomes Competitive Gaming.
            </p>
            <p className="mt-4 max-w-xl text-base text-slate-400 sm:text-lg">
              Frx Arcade transforms Uniswap V4 liquidity into live competitive gaming
              economies on X Layer. Compete in skill-based puzzle tournaments, climb global
              leaderboards, and earn rewards powered by programmable liquidity and AI-driven
              tournament systems.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span
                  key={badge}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300 backdrop-blur-sm sm:text-xs"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button href="/demo" variant="primary">
                Start Competing
              </Button>
              <Button href="#game" variant="secondary">
                Watch Gameplay
              </Button>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {statItems.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 backdrop-blur-md"
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-500 sm:text-[10px]">
                    {label}
                  </p>
                  <p className="mt-1 text-lg font-bold tabular-nums text-white sm:text-xl">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
          <HeroTilePreview />
        </div>
      </Container>
    </section>
  );
}
