"use client";

import { Check } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { GameMockCard } from "@/components/landing/GameMockCard";
import { Button } from "@/components/Button";

const features = [
  "Skill-Based Gameplay",
  "Increasing Difficulty",
  "Global Leaderboards",
  "3 Attempt Tournament Format",
  "Real-Time Competition",
  "Mobile-Friendly Gameplay",
] as const;

export function GameSection() {
  return (
    <Reveal>
      <SectionShell id="game" className="border-t border-white/5 bg-white/[0.02]">
        <div className="grid items-start gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-300/90">
              Gameplay Showcase
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Enter The Arena
            </h2>
            <p className="mt-4 text-lg text-slate-400">
              Experience fast-paced competitive puzzle gameplay designed for skill, strategy,
              and replayability.
            </p>

            <h3 className="mt-8 text-xl font-bold text-white">Tile Rush</h3>
            <p className="mt-2 text-sm text-slate-400">
              A competitive triple-match survival puzzle game where every move matters. Match
              tiles, manage tray pressure, and push your score higher before the board
              overwhelms you.
            </p>

            <h4 className="mt-8 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Gameplay Features
            </h4>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {features.map((text) => (
                <li key={text} className="flex gap-3 text-sm text-slate-300">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-300">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ul>

            <Button href="/demo" variant="primary" className="mt-8 px-6 py-3">
              Play Tile Rush
            </Button>
          </div>
          <GameMockCard />
        </div>
      </SectionShell>
    </Reveal>
  );
}
