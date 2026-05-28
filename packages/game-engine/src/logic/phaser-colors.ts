import { TILE_FACE_COUNT } from "./constants";
import { tileMatchKey } from "./tile-styles";

/** HSL (h 0-360, s/l 0-100) → 0xRRGGBB for Phaser fills. */
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
  fill: number;
  stroke: number;
  text: number;
};

export function phaserTileColors(type: number): PhaserTileColors {
  const key = tileMatchKey(type);
  const h = (key * 360) / TILE_FACE_COUNT;
  return {
    fill: hslToHex(h, 75, 82),
    stroke: hslToHex(h, 55, 42),
    text: hslToHex(h, 42, 16),
  };
}
