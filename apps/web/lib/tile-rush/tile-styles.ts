import { TILE_TYPES, TILE_FACE_COUNT } from "./constants";

/** 0..TILE_FACE_COUNT-1; same key ⇔ same face number (see `tileLabel`). */
export function tileMatchKey(type: number): number {
  const i = Math.max(0, Math.min((type | 0), TILE_TYPES - 1));
  return i % TILE_FACE_COUNT;
}

/** Face label 1..TILE_FACE_COUNT. Tray triples match on `tileMatchKey`. */
export function tileLabel(type: number): string {
  return String(tileMatchKey(type) + 1);
}

/** CSS paint for one face key — same number ⇒ same hues (board + tray). */
export type TileFacePaint = {
  background: string;
  borderColor: string;
  borderBottomColor: string;
  color: string;
  textShadow: string;
  boxShadow: string;
};

function paintForMatchKey(k: number): TileFacePaint {
  const key = ((k % TILE_FACE_COUNT) + TILE_FACE_COUNT) % TILE_FACE_COUNT;
  const h = (key * 360) / TILE_FACE_COUNT;
  return {
    background: `linear-gradient(to bottom, hsl(${h} 82% 91%), hsl(${h} 68% 76%))`,
    borderColor: `hsla(${h} 55% 42% / 0.5)`,
    borderBottomColor: `hsl(${h} 58% 30%)`,
    color: `hsl(${h} 42% 16%)`,
    textShadow: "0 1px 0 hsl(0 0% 100% / 0.55)",
    boxShadow: `2px 4px 0 hsla(${h} 48% 32% / 0.55), inset 0 1px 0 hsla(${h} 40% 100% / 0.65)`,
  };
}

/** Distinct pastel per face digit; triples share the same styling. */
export function tileFacePaint(type: number): TileFacePaint {
  return paintForMatchKey(tileMatchKey(type));
}
