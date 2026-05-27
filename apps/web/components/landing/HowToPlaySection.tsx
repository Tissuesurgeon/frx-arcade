"use client";

import { motion } from "framer-motion";
import {
  Clock,
  Coins,
  Layers,
  MousePointerClick,
  RefreshCw,
  Target,
  Trophy,
} from "lucide-react";
import { DAILY_ENTRY_FEE, MAX_ATTEMPTS_PER_TOURNAMENT } from "@frx/shared";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { Button } from "@/components/Button";
import {
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
  TRAY_MAX,
  TRAY_MAX_EASY,
  MATCHES_BEFORE_HARD_TRAY,
} from "@/lib/tile-rush/constants";

const rules = [
  {
    icon: MousePointerClick,
    title: "Tap exposed tiles",
    description:
      "Only tiles with no tile above them can be selected. Each tap moves a tile into your tray at the bottom of the screen.",
  },
  {
    icon: Target,
    title: "Match three to score",
    description:
      "When three tiles of the same type sit in the tray, they clear automatically and your match count increases by one.",
  },
  {
    icon: Layers,
    title: "Manage tray pressure",
    description: `The tray holds up to ${TRAY_MAX_EASY} tiles at first, then shrinks to ${TRAY_MAX} after ${MATCHES_BEFORE_HARD_TRAY} matches. If the tray fills with no valid triple, the run ends.`,
  },
  {
    icon: Clock,
    title: "Beat the clock",
    description: `Each attempt is ${Math.floor(ROUND_TIME_SECONDS / 60)} minutes. Your score for that run is the number of matches you complete before time runs out or the board overwhelms you.`,
  },
  {
    icon: RefreshCw,
    title: "Shuffle when stuck",
    description: `You get ${SHUFFLES_PER_RUN} shuffles per run to reshuffle tile types on the board — use them before the tray locks up.`,
  },
  {
    icon: Trophy,
    title: "Three attempts, one total",
    description: `Tournament pools give you ${MAX_ATTEMPTS_PER_TOURNAMENT} attempts. Your leaderboard total is the sum of all three run scores — maximize every attempt.`,
  },
] as const;

const joinSteps = [
  "Connect OKX Wallet on X Layer Testnet",
  "Swap OKB for FRX Credits via the FRX hook",
  `Join a daily pool from the dashboard (${DAILY_ENTRY_FEE} FRX entry)`,
  "Play all 3 attempts — scores post to the pool leaderboard automatically",
] as const;

export function HowToPlaySection() {
  return (
    <Reveal>
      <SectionShell id="how-to-play" className="border-t border-white/5">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
            Tile Rush
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How to Play
          </h2>
          <p className="mt-4 text-slate-400">
            Tile Rush is a competitive triple-match survival puzzle. Clear tiles, survive tray
            pressure, and push your match count higher than everyone else in the pool.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {rules.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-300">
                  {i + 1}
                </span>
                <Icon className="h-5 w-5 text-cyan-400" strokeWidth={1.75} />
              </div>
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-12 max-w-2xl rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold text-white">Join a tournament pool</h3>
          </div>
          <ol className="mt-4 space-y-3">
            {joinSteps.map((step, i) => (
              <li key={step} className="flex gap-3 text-sm text-slate-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xs font-bold text-cyan-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/demo" variant="primary" className="px-5 py-2.5">
              Get started
            </Button>
            <Button href="/dashboard" variant="secondary" className="px-5 py-2.5">
              Browse pools
            </Button>
          </div>
        </div>
      </SectionShell>
    </Reveal>
  );
}
