"use client";

import { Reveal } from "@/components/landing/Reveal";
import { SectionShell } from "@/components/landing/SectionShell";
import { Button } from "@/components/Button";

export function FinalCta() {
  return (
    <Reveal>
      <SectionShell className="pb-20 sm:pb-28">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 px-8 py-14 text-center shadow-2xl shadow-indigo-500/10 backdrop-blur-md sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.2),transparent_50%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(34,211,238,0.12),transparent_45%)]" />
          <h2 className="relative text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
            The Future of Competitive Gaming Starts Here
          </h2>
          <p className="relative mx-auto mt-4 max-w-2xl text-slate-400">
            Compete in skill-based tournaments, earn rewards powered by programmable liquidity,
            and experience the next generation of gaming economies on X Layer.
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button href="/demo" variant="primary" className="px-8 py-3 text-base">
              Start Competing
            </Button>
            <Button href="#community" variant="secondary" className="px-8 py-3 text-base">
              Join The Community
            </Button>
          </div>
        </div>
      </SectionShell>
    </Reveal>
  );
}
