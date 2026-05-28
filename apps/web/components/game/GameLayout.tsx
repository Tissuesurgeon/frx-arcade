"use client";

import type { ReactNode } from "react";

type GameLayoutProps = {
  header: ReactNode;
  center: ReactNode;
  bottom: ReactNode;
};

/**
 * Classic tile-match viewport: HUD → stage (board) → dock (tray).
 * Mobile uses a felt table stage + bottom game dock (tile-match app pattern).
 */
export function GameLayout({ header, center, bottom }: GameLayoutProps) {
  return (
    <div
      className="relative grid h-full min-h-0 overflow-hidden"
      style={{
        gridTemplateRows: "auto minmax(0, 1fr) auto",
      }}
    >
      {/* Desktop background */}
      <div
        className="pointer-events-none absolute inset-0 hidden opacity-[0.12] sm:block"
        aria-hidden
        style={{
          background:
            "linear-gradient(180deg, var(--color-frx-bg) 0%, var(--color-frx-bg-end) 55%, var(--color-frx-bg-end) 100%)",
          backgroundImage: `radial-gradient(1.5px 1.5px at 20% 30%, rgba(99,102,241,0.45), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(34,211,238,0.35), transparent),
            radial-gradient(1px 1px at 40% 80%, rgba(167,139,250,0.3), transparent)`,
          backgroundSize: "100% 100%",
        }}
      />

      {/* Mobile stage backdrop — esports arena */}
      <div
        className="pointer-events-none absolute inset-0 sm:hidden"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% 0%, #0f1923 0%, #0a0e14 55%, #06080c 100%)",
        }}
      />

      <header className="relative z-[2] shrink-0 px-2 pt-2 sm:px-4 sm:pt-3 lg:px-5">
        {header}
      </header>

      <main className="relative z-[1] flex min-h-0 flex-col overflow-hidden px-0 py-0 sm:px-4 sm:py-2 lg:px-5">
        <div className="@container/board flex h-full min-h-0 min-w-0 flex-1 items-start justify-stretch sm:items-center sm:justify-center [container-type:size]">
          {center}
        </div>
      </main>

      <footer className="relative z-[2] shrink-0 px-0 py-0 pb-[env(safe-area-inset-bottom,0px)] sm:border-t sm:border-white/10 sm:bg-frx-bg/80 sm:px-4 sm:py-3 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] lg:px-5">
        <div className="sm:hidden rounded-t-xl border border-b-0 border-[#ff4655]/25 bg-gradient-to-b from-[#0f1923]/98 to-[#0a0e14] px-3 py-2.5 shadow-[0_-12px_48px_rgba(255,70,85,0.08)] backdrop-blur-xl">
          {bottom}
        </div>
        <div className="hidden sm:block">{bottom}</div>
      </footer>
    </div>
  );
}
