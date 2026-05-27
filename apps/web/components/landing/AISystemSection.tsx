"use client";

import { useQuery } from "@tanstack/react-query";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { apiFetch } from "@/lib/api";
import { Bot, Shield, Sparkles, Zap } from "lucide-react";

export function AISystemSection() {
  const { data } = useQuery({
    queryKey: ["agent-signals"],
    queryFn: () =>
      apiFetch<{
        signals: { title: string; summary: string; severity: string; createdAt: string }[];
      }>("/api/agent/signals"),
    refetchInterval: 60_000,
  });

  const features = [
    {
      icon: Bot,
      title: "Autonomous Tournament Creation",
      description: "AI agents automatically launch and balance live tournaments.",
    },
    {
      icon: Sparkles,
      title: "Dynamic Reward Optimization",
      description:
        "Tournament rewards scale based on ecosystem activity and liquidity.",
    },
    {
      icon: Shield,
      title: "Anti-Cheat Protection",
      description:
        "AI systems monitor suspicious gameplay and protect competitive integrity.",
    },
    {
      icon: Zap,
      title: "Live Event Management",
      description:
        "AI agents trigger flash tournaments, boosted rewards, and jackpot events in real time.",
    },
  ];

  return (
    <Reveal>
      <SectionShell id="ai-system" className="border-t border-white/5">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/90">
          AI Tournament System
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          AI-Powered Tournament Management
        </h2>
        <p className="mt-4 max-w-2xl text-slate-400">
          Frx Arcade uses autonomous AI agents to optimize tournaments, monitor competition,
          and power dynamic gaming events.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <Icon className="h-8 w-8 text-cyan-400" strokeWidth={1.5} />
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          ))}
        </div>
        {data?.signals?.length ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-black/30 p-5">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Recent agent actions
            </p>
            <ul className="mt-3 space-y-2">
              {data.signals.slice(0, 4).map((s) => (
                <li key={s.title + s.createdAt} className="text-sm text-slate-300">
                  <span className="font-medium text-white">{s.title}</span> — {s.summary}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </SectionShell>
    </Reveal>
  );
}
