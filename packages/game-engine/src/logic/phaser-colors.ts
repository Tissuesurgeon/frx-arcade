import { TILE_FACE_COUNT } from "./constants";
import { tileMatchKey } from "./tile-styles";

export function hslToHex(h: number, s: number, l: number): number {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  const ri = Math.round((r + m) * 255);
  const gi = Math.round((g + m) * 255);
  const bi = Math.round((b + m) * 255);
  return (ri << 16) | (gi << 8) | bi;
}

export type PhaserTileColors = {
  fillTop: number;
  fill: number;
  borderBottom: number;
  stroke: number;
  text: number;
};

/** Matches `tileFacePaint()` in apps/web/lib/tile-rush/tile-styles.ts */
export function phaserTileColors(type: number): PhaserTileColors {
  const key = tileMatchKey(type);
  const h = (key * 360) / TILE_FACE_COUNT;
  return {
    fillTop: hslToHex(h, 82, 91),
    fill: hslToHex(h, 68, 76),
    stroke: hslToHex(h, 55, 42),
    borderBottom: hslToHex(h, 58, 30),
    text: hslToHex(h, 42, 16),
  };
}
