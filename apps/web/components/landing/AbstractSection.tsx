"use client";

import { Blocks, Cpu, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const pillars = [
  {
    icon: Gamepad2,
    title: "Competitive gameplay",
    body: "Short-session tournaments where performance—not passive farming—determines outcomes.",
  },
  {
    icon: Cpu,
    title: "Deterministic fairness",
    body: "Identical boards and conditions for every entrant: no RNG advantage, fewer disputes.",
  },
  {
    icon: Blocks,
    title: "Blockchain settlement",
    body: "Pools, custody, and reward distribution anchored on-chain with gameplay-first UX.",
  },
] as const;

export function AbstractSection() {
  return (
    <Reveal>
      <SectionShell
        id="protocol"
        className="border-t border-white/5 bg-white/[0.02]"
      >
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400/90">
          Frx Arcade Whitepaper
        </p>
        <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Play-to-Compete Gaming Protocol
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-center text-sm leading-relaxed text-slate-400 sm:text-base">
          Frx Arcade is a decentralized gaming platform built around{" "}
          <span className="text-slate-200">Play-to-Compete (P2C)</span>: skill-based
          tournaments where rewards come from{" "}
          <span className="text-slate-200">pooled entry fees</span>, not inflationary
          emissions. The first game,{" "}
          <span className="text-slate-200">Tile Rush</span>, anchors a scalable
          competitive arcade ecosystem.
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-center text-xs text-slate-500 sm:text-sm">
          Vision: make competition monetizable, skill valuable, and gaming economically
          meaningful—global infrastructure for skill-based competitive gaming economies.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {pillars.map(({ icon: Icon, title, body }) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.02, y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/20 backdrop-blur-md"
            >
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/10 p-3 ring-1 ring-white/10">
                <Icon className="h-6 w-6 text-cyan-300" aria-hidden />
              </div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{body}</p>
            </motion.div>
          ))}
        </div>
      </SectionShell>
    </Reveal>
  );
}
