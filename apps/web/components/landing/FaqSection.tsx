"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";

const faqs = [
  {
    q: "What are FRX Credits?",
    a: "FRX Credits are gameplay utility credits used to enter tournaments and participate in the Frx Arcade ecosystem.",
  },
  {
    q: "Is Frx Arcade a gambling platform?",
    a: "No. Frx Arcade is a skill-based competitive gaming platform focused on puzzle tournaments and leaderboard competition.",
  },
  {
    q: "How are tournament rewards funded?",
    a: "Rewards are funded through tournament entry pools and Uniswap V4 Hook-powered liquidity allocations.",
  },
  {
    q: "What blockchain is Frx Arcade built on?",
    a: "Frx Arcade is built on X Layer.",
  },
  {
    q: "What are Uniswap V4 Hooks?",
    a: "Uniswap V4 Hooks are programmable smart contracts that allow custom logic to interact with liquidity pools. Frx Arcade uses Hooks to power tournament economies and jackpot systems.",
  },
  {
    q: "Can I play on mobile?",
    a: "Yes. Frx Arcade is designed for desktop and mobile gameplay.",
  },
] as const;

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Reveal>
      <SectionShell id="faq" className="border-t border-white/5">
        <h2 className="text-center text-3xl font-bold tracking-tight text-white sm:text-4xl">
          FAQ
        </h2>
        <div className="mx-auto mt-10 max-w-3xl divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {faqs.map(({ q, a }, i) => {
            const open = openIndex === i;
            return (
              <div key={q}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                  onClick={() => setOpenIndex(open ? null : i)}
                >
                  <span className="font-semibold text-white">{q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open ? (
                  <p className="px-5 pb-4 text-sm leading-relaxed text-slate-400">{a}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </SectionShell>
    </Reveal>
  );
}
