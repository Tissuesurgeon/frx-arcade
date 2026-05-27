"use client";

import type { CSSProperties } from "react";
import type { Tile } from "@/lib/tile-rush/types";
import { getTileDiameterNorm } from "@/lib/tile-rush/layout";
import { tileFacePaint, tileLabel } from "@/lib/tile-rush/tile-styles";
import { gameTileFaceClass } from "@/components/game/Tile";

const faceAbsolute = `${gameTileFaceClass} absolute`;

/** Matches play `TileGrid`: square sized by width and dynamic viewport height. */
const PREVIEW_BOARD_SQUARE: CSSProperties = {
  width: "min(100%, min(58dvh, 520px))",
  aspectRatio: "1 / 1",
};

/**
 * Read-only board shell matching `TileGrid` + `Tile` visuals (no motion / tap).
 */
export function StaticPreviewTileGrid({ tiles }: { tiles: Tile[] }) {
  const tileD = `${getTileDiameterNorm() * 100}%`;

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,720px)] px-0.5 sm:px-1 lg:max-w-[min(100%,760px)] lg:px-2">
      <div className="relative mx-auto" style={PREVIEW_BOARD_SQUARE}>
        <div
          className="pointer-events-none absolute -inset-2 z-0 rounded-[1.35rem] bg-gradient-to-br from-indigo-500/25 via-transparent to-cyan-500/20 blur-xl"
          aria-hidden
        />
        <div
          className="relative z-[1] h-full w-full overflow-hidden rounded-2xl border border-white/10 bg-frx-bg/80 shadow-2xl shadow-indigo-500/20 backdrop-blur-md sm:rounded-3xl"
          style={{
            touchAction: "manipulation",
            boxShadow:
              "0 25px 50px -12px rgba(99, 102, 241, 0.3), 0 0 0 1px rgba(255,255,255,0.1)",
            background: `
            radial-gradient(ellipse 100% 70% at 50% -10%, rgba(99, 102, 241, 0.22) 0%, transparent 50%),
            radial-gradient(ellipse 80% 50% at 100% 100%, rgba(34, 211, 238, 0.08) 0%, transparent 45%),
            var(--color-frx-bg, #0b0f1a)
          `,
          }}
        >
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='48' height='48' viewBox='0 0 48 48' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='24' cy='24' r='1.2' fill='%236366f1'/%3E%3C/svg%3E")`,
              backgroundSize: "24px 24px",
            }}
          />
          <div className="relative h-full w-full p-1.5 sm:p-2.5 md:p-3">
            <div
              className="relative h-full min-h-0 w-full min-w-0"
              style={{ ["--tile-d"]: tileD } as CSSProperties}
            >
              {[...tiles]
                .sort((a, b) => a.zIndex - b.zIndex)
                .map((tile) => {
                  const label = tileLabel(tile.type);
                  const paint = tileFacePaint(tile.type);
                  return (
                    <div
                      key={tile.id}
                      className={`${faceAbsolute} pointer-events-none select-none`}
                      style={{
                        left: `${tile.xNorm * 100}%`,
                        top: `${tile.yNorm * 100}%`,
                        width: "var(--tile-d, 12%)",
                        aspectRatio: "1",
                        transform: "translate(-50%, -50%)",
                        zIndex: tile.zIndex,
                        background: paint.background,
                        borderColor: paint.borderColor,
                        borderBottomColor: paint.borderBottomColor,
                        color: paint.color,
                        boxShadow: paint.boxShadow,
                      }}
                    >
                      <span
                        aria-hidden
                        className="select-none"
                        style={{ textShadow: paint.textShadow }}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
