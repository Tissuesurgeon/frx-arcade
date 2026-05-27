"use client";

import { Eye, Layers, Lock, Sparkles } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const points = [
  {
    icon: Sparkles,
    text: "Deterministic gameplay & seed-based generation",
  },
  {
    icon: Lock,
    text: "Anti-cheat: server-authoritative play & input validation",
  },
  {
    icon: Layers,
    text: "Verification layer for leaderboard validation",
  },
  {
    icon: Eye,
    text: "Transparent scoring you can reason about and audit",
  },
] as const;

export function TrustSection() {
  return (
    <Reveal>
      <SectionShell>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 p-8 shadow-2xl backdrop-blur-md sm:p-12">
          <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for Fair Competition
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-slate-400">
            Architecture splits responsibilities:{" "}
            <span className="text-slate-300">on-chain</span> custody and settlement,{" "}
            <span className="text-slate-300">off-chain</span> engine and real-time play, and a
            dedicated <span className="text-slate-300">verification</span> path for scores and
            anti-cheat—so fairness is structural, not aspirational.
          </p>
          <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
            {points.map(({ icon: Icon, text }) => (
              <li
                key={text}
                className="flex items-center gap-4 rounded-2xl border border-white/10 bg-black/20 px-5 py-4"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="text-sm font-medium text-slate-200">{text}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionShell>
    </Reveal>
  );
}
