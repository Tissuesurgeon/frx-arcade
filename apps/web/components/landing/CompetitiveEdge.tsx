"use client";

import { motion } from "framer-motion";
import {
  Bot,
  Droplets,
  Gamepad2,
  Scale,
  Smartphone,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const items = [
  {
    icon: Gamepad2,
    title: "Gameplay First",
    description: "Built around skill-based competitive gameplay — not speculation.",
  },
  {
    icon: Droplets,
    title: "Programmable Liquidity",
    description: "Uniswap V4 Hooks transform liquidity into live gaming economies.",
  },
  {
    icon: Zap,
    title: "Real-Time Competition",
    description: "Join live tournaments and compete globally in real time.",
  },
  {
    icon: Bot,
    title: "AI-Powered Systems",
    description: "Autonomous AI agents optimize tournaments and ecosystem dynamics.",
  },
  {
    icon: Scale,
    title: "Transparent Rewards",
    description: "Smart contracts manage tournament rewards and treasury accounting.",
  },
  {
    icon: Smartphone,
    title: "Built For Everyone",
    description: "Fast, accessible, mobile-friendly gameplay designed for mass adoption.",
  },
] as const;

export function CompetitiveEdge() {
  return (
    <Reveal>
      <SectionShell id="why-frx">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Why Frx Arcade
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, description }) => (
            <motion.div
              key={title}
              whileHover={{ scale: 1.02, y: -2 }}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg shadow-black/10 backdrop-blur-md"
            >
              <div className="inline-flex rounded-xl bg-indigo-500/15 p-3 ring-1 ring-white/10">
                <Icon className="h-5 w-5 text-indigo-300" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </motion.div>
          ))}
        </div>
      </SectionShell>
    </Reveal>
  );
}
