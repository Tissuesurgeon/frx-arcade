"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { HOOK_SPLIT_BPS } from "@frx/shared";
import { apiFetch } from "@/lib/api";
import { explorerAddressUrl } from "@/lib/contracts/swapCreditRouter";
import {
  ArrowRight,
  Droplets,
  ExternalLink,
  Gamepad2,
  LineChart,
  Scale,
  Trophy,
  Zap,
} from "lucide-react";

const features = [
  {
    icon: Gamepad2,
    title: "Liquidity-Powered Tournaments",
    description:
      "Uniswap V4 Hooks automatically fund tournament prize pools in real time.",
  },
  {
    icon: LineChart,
    title: "Dynamic Reward Scaling",
    description:
      "Higher ecosystem activity increases tournament rewards and jackpot growth.",
  },
  {
    icon: Zap,
    title: "Real-Time Treasury Funding",
    description: "Every swap contributes directly to the competitive gaming economy.",
  },
  {
    icon: Scale,
    title: "Transparent Settlement",
    description:
      "Smart contracts handle reward distribution and treasury accounting onchain.",
  },
] as const;

export function HookAnalyticsSection() {
  const { data: metrics } = useQuery({
    queryKey: ["hook-metrics"],
    queryFn: () =>
      apiFetch<{
        totalSwaps: number;
        treasuryInflowWei: string;
        jackpotVolumeWei: string;
        tournamentFundingWei: string;
        last24hSwaps: number;
        liquidityScore: number;
      }>("/api/hooks/metrics"),
    refetchInterval: 20_000,
  });

  const { data: contracts } = useQuery({
    queryKey: ["hook-contracts"],
    queryFn: () =>
      apiFetch<{
        frxArcadeHookAddress: string | null;
        swapCreditRouterAddress: string | null;
        poolManagerAddress: string | null;
        poolId: string | null;
      }>("/api/hooks/contracts"),
  });

  const hasMetrics = (metrics?.totalSwaps ?? 0) > 0;

  const displayMetrics = [
    {
      label: "Total Swaps",
      value: hasMetrics ? metrics!.totalSwaps.toLocaleString() : "0",
      icon: Zap,
    },
    {
      label: "24h Swaps",
      value: hasMetrics ? metrics!.last24hSwaps.toLocaleString() : "0",
      icon: Droplets,
    },
    {
      label: "Liquidity Score",
      value: hasMetrics ? `${(metrics!.liquidityScore * 100).toFixed(0)}%` : "—",
      icon: Trophy,
    },
  ];

  return (
    <section id="hook-economy" className="border-t border-white/5 py-20">
      <div className="mx-auto max-w-6xl px-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-400/90">
          Uniswap V4 Hook
        </p>
        <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
          Powered by Uniswap V4 Hooks
        </h2>
        <p className="mt-3 max-w-2xl text-slate-400">
          Frx Arcade transforms programmable liquidity into a live gaming economy. Every swap
          helps fund tournaments, jackpot pools, and ecosystem rewards.
        </p>

        {contracts?.frxArcadeHookAddress ? (
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            <a
              href={explorerAddressUrl(contracts.frxArcadeHookAddress)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-cyan-300 hover:border-cyan-500/40"
            >
              Hook contract <ExternalLink className="h-3 w-3" />
            </a>
            {contracts.swapCreditRouterAddress ? (
              <a
                href={explorerAddressUrl(contracts.swapCreditRouterAddress)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-cyan-300 hover:border-cyan-500/40"
              >
                Swap router <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        ) : null}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-md"
            >
              <Icon className="h-6 w-6 text-cyan-400" strokeWidth={1.5} />
              <h3 className="mt-3 font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-400">{description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            {[
              { step: "Swap", desc: "User swaps OKB through hooked V4 pool" },
              { step: "Hook", desc: "FRXArcadeHook afterSwap captures fee delta" },
              {
                step: "Split",
                desc: `${HOOK_SPLIT_BPS.tournamentTreasury / 100}% treasury · ${HOOK_SPLIT_BPS.jackpot / 100}% jackpot · ${HOOK_SPLIT_BPS.ecosystemReserve / 100}% reserve`,
              },
              { step: "Play", desc: "Treasury scales live tournament rewards" },
            ].map(({ step, desc }, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -12 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/20 text-xs font-bold text-indigo-300">
                  {i + 1}
                </span>
                <div>
                  <p className="font-semibold text-white">{step}</p>
                  <p className="text-sm text-slate-400">{desc}</p>
                </div>
                {i < 3 && (
                  <ArrowRight className="ml-auto hidden h-4 w-4 text-slate-600 sm:block" />
                )}
              </motion.div>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {displayMetrics.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-indigo-500/10 to-cyan-500/5 p-5"
              >
                <Icon className="h-5 w-5 text-cyan-400" />
                <p className="mt-3 text-xs uppercase tracking-wider text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-bold tabular-nums text-white">{value}</p>
              </div>
            ))}
            {!hasMetrics ? (
              <p className="text-sm text-slate-500 sm:col-span-3 lg:col-span-1">
                On-chain metrics appear after the first V4 swap is indexed.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
