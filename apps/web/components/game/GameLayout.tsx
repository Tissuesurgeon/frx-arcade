"use client";

import type { ReactNode } from "react";

type GameLayoutProps = {
  header: ReactNode;
  center: ReactNode;
  bottom: ReactNode;
};

/**
 * Classic tile-match viewport: HUD → stage (board) → dock (tray).
 * Uses a 3-row grid so the board absorbs leftover height without page scroll.
 */
export function GameLayout({ header, center, bottom }: GameLayoutProps) {
  return (
    <div
      className="relative grid h-full min-h-0 overflow-hidden"
      style={{
        gridTemplateRows: "auto minmax(0, 1fr) auto",
        background:
          "linear-gradient(180deg, var(--color-frx-bg) 0%, var(--color-frx-bg-end) 55%, var(--color-frx-bg-end) 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.12]"
        aria-hidden
        style={{
          backgroundImage: `radial-gradient(1.5px 1.5px at 20% 30%, rgba(99,102,241,0.45), transparent),
            radial-gradient(1px 1px at 70% 60%, rgba(34,211,238,0.35), transparent),
            radial-gradient(1px 1px at 40% 80%, rgba(167,139,250,0.3), transparent)`,
          backgroundSize: "100% 100%",
        }}
      />

      <header className="relative z-[2] shrink-0 px-2 pt-2 sm:px-4 sm:pt-3 lg:px-5">
        {header}
      </header>

      <main className="relative z-[1] min-h-0 px-2 py-1 sm:px-4 sm:py-2 lg:px-5">
        <div className="@container/board flex h-full min-h-0 min-w-0 items-center justify-center overflow-hidden [container-type:size]">
          {center}
        </div>
      </main>

      <footer className="relative z-[2] shrink-0 border-t border-white/10 bg-frx-bg/80 px-2 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4 sm:py-3 lg:px-5">
        {bottom}
      </footer>
    </div>
  );
}
