"use client";

import { motion } from "framer-motion";
import { Coins, Gamepad2, Trophy, TrendingUp } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const steps = [
  {
    icon: Coins,
    title: "Swap Into FRX Credits",
    description:
      "Deposit X Layer tokens and receive FRX Credits to enter tournaments and compete across the platform.",
  },
  {
    icon: Gamepad2,
    title: "Join Competitive Tournaments",
    description:
      "Enter live tournaments, challenge other players, and compete in skill-based puzzle battles.",
  },
  {
    icon: TrendingUp,
    title: "Climb The Leaderboards",
    description:
      "Every match matters. Improve your score, rise through the rankings, and unlock bigger rewards.",
  },
  {
    icon: Trophy,
    title: "Earn Rewards",
    description:
      "Top players earn FRX Credits backed by real liquidity and automated smart contract settlement.",
  },
] as const;

export function HowItWorks() {
  return (
    <Reveal>
      <SectionShell id="how-it-works">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          How Frx Arcade Works
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, description }, i) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.02, y: -2 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="group relative rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-md"
            >
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 p-3 ring-1 ring-white/10">
                <Icon className="h-6 w-6 text-cyan-300" aria-hidden />
              </div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
                Step {i + 1}
              </div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
              <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 ring-1 ring-cyan-400/30 transition-opacity group-hover:opacity-100" />
            </motion.div>
          ))}
        </div>
      </SectionShell>
    </Reveal>
  );
}
