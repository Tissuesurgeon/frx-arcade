"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const web3Problems = [
  "Tokens prioritized over gameplay",
  "Inflationary economies that erode retention",
  "Players churn when yield—not fun—is the hook",
] as const;

const tradProblems = [
  "No aligned financial incentives for competitors",
  "Closed ecosystems and limited upside",
  "Little ownership or transparent monetization paths",
] as const;

const solutions = [
  "Pool-based competitive gaming: enter tournaments, win from pooled funds",
  "Deterministic fairness: identical environments, verifiable outcomes",
  "Skill-based outcomes: rankings reflect performance only",
  "Gameplay-first UX: Web3 settlement without compromising the loop",
] as const;

export function ProblemSolution() {
  return (
    <Reveal>
      <SectionShell id="market">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          The Market Gap
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-slate-400">
          Today&apos;s landscape leaves competitive players underserved. Frx Arcade targets{" "}
          <span className="text-slate-200">
            short-session, skill-based, competitive micro-tournaments
          </span>{" "}
          with real stakes and transparent rules.
        </p>
        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-300/90">
              Web3 gaming failures
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              {web3Problems.map((t) => (
                <li key={t} className="border-l-2 border-rose-500/40 pl-3">
                  {t}
                </li>
              ))}
            </ul>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-amber-200/80">
              Traditional gaming limits
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-400">
              {tradProblems.map((t) => (
                <li key={t} className="border-l-2 border-amber-500/30 pl-3">
                  {t}
                </li>
              ))}
            </ul>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 p-6 shadow-lg backdrop-blur-md"
          >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cyan-300">
              Frx Arcade solution
            </h3>
            <ul className="mt-4 space-y-4">
              {solutions.map((text) => (
                <li key={text} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </SectionShell>
    </Reveal>
  );
}
