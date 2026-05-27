"use client";

import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const phases = [
  {
    phase: "Phase 1",
    title: "Launch Tile Rush",
    items: [
      "Live tournaments",
      "FRX Credits",
      "Hook-powered economy",
      "Global leaderboards",
    ],
  },
  {
    phase: "Phase 2",
    title: "Expand Competitive Modes",
    items: [
      "Ranked seasons",
      "Flash tournaments",
      "Team competitions",
      "Enhanced AI orchestration",
    ],
  },
  {
    phase: "Phase 3",
    title: "Multi-Game Ecosystem",
    items: [
      "Additional puzzle games",
      "Cross-game rankings",
      "Seasonal championships",
      "Creator tournaments",
    ],
  },
  {
    phase: "Phase 4",
    title: "Competitive Gaming Network",
    items: [
      "Esports tournaments",
      "Streaming integrations",
      "Community events",
      "Ecosystem partnerships",
    ],
  },
] as const;

export function RoadmapSection() {
  return (
    <Reveal>
      <SectionShell id="roadmap" className="border-t border-white/5">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Roadmap
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {phases.map(({ phase, title, items }, i) => (
            <div
              key={phase}
              className="relative rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <p className="text-xs font-bold uppercase tracking-wider text-cyan-400">
                {phase}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
              <ul className="mt-4 space-y-2">
                {items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-slate-400">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
                    {item}
                  </li>
                ))}
              </ul>
              {i < phases.length - 1 ? (
                <span className="absolute -right-3 top-1/2 hidden h-0.5 w-6 -translate-y-1/2 bg-gradient-to-r from-indigo-500/50 to-transparent lg:block" />
              ) : null}
            </div>
          ))}
        </div>
      </SectionShell>
    </Reveal>
  );
}
