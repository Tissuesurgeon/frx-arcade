"use client";

import { GameScreenshotMock } from "@/components/landing/GameScreenshotMock";

const BOARD_DOT_PATTERN = `url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='1.2' fill='%236366f1'/%3E%3C/svg%3E")`;

/** Mirrored from `TileGrid` / `StaticPreviewTileGrid` so the hero reads as the real game frame. */
export function HeroTilePreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 z-0 select-none rounded-[1.75rem]"
      >
        {/* Live TileGrid outer halo */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-br from-indigo-500/25 via-transparent to-cyan-500/20 blur-xl" />
        {/* Board shell: same radial stack + rim as the play-view board (see TileGrid). */}
        <div
          className="absolute inset-1 overflow-hidden rounded-2xl border border-white/10 shadow-2xl shadow-indigo-500/25"
          style={{
            background: `
              radial-gradient(ellipse 100% 70% at 50% -10%, rgba(99, 102, 241, 0.26) 0%, transparent 52%),
              radial-gradient(ellipse 80% 50% at 100% 100%, rgba(34, 211, 238, 0.1) 0%, transparent 48%),
              var(--color-frx-bg, #0b0f1a)
            `,
            boxShadow: `
              0 25px 50px -12px rgba(99, 102, 241, 0.35),
              0 0 0 1px rgba(255, 255, 255, 0.08),
              inset 0 1px 0 rgba(255, 255, 255, 0.07)
            `,
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage: BOARD_DOT_PATTERN,
              backgroundSize: "24px 24px",
            }}
          />
          {/* Turtle / board focus — square aspect hint */}
          <div
            className="absolute left-[9%] right-[9%] top-[12%] rounded-2xl opacity-[0.14]"
            style={{
              aspectRatio: "1 / 1",
              background:
                "radial-gradient(ellipse 85% 70% at 50% 45%, rgba(99, 102, 241, 0.5) 0%, transparent 65%)",
            }}
          />
          {/* Tray + action strip — matches GameLayout bottom cluster */}
          <div
            className="absolute inset-x-[7%] bottom-[6%] h-[26%] rounded-2xl opacity-90"
            style={{
              background:
                "linear-gradient(to top, rgba(99, 102, 241, 0.18) 0%, rgba(34, 211, 238, 0.06) 45%, transparent 100%)",
              boxShadow: "inset 0 -1px 0 rgba(255,255,255,0.05)",
            }}
          />
        </div>
      </div>
      <div className="relative z-10">
        <GameScreenshotMock
          className="shadow-2xl shadow-indigo-500/20"
          role="img"
          aria-label="Tile Rush in-game screenshot preview"
          score="36"
        />
      </div>
    </div>
  );
}
