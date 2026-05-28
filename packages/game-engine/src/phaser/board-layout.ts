import { buildSlotPositions, getTileDiameterNorm } from "../logic/layout";
import { MOBILE_TILE_SCALE, TILE_ASPECT } from "./theme";

export type BoardTransform = {
  tileW: number;
  tileH: number;
  mapPosition: (xNorm: number, yNorm: number, layer: number) => { x: number; y: number };
};

/**
 * Pixel-space board fit — mirrors `computeMobileBoardFit` from the React TileGrid.
 */
export function computeBoardTransform(
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  isMobile: boolean
): BoardTransform {
  const slots = buildSlotPositions();
  const padX = isMobile ? 0.028 : 0.06;
  const padTop = isMobile ? 0.01 : 0.04;
  const padBottom = isMobile ? 0.016 : 0.05;
  const availW = 1 - 2 * padX;
  const availH = 1 - padTop - padBottom;
  const aspect = TILE_ASPECT;

  let diameter =
    getTileDiameterNorm() * (isMobile ? MOBILE_TILE_SCALE : 0.94);

  for (let iter = 0; iter < 14; iter++) {
    const halfW = diameter / 2;
    const halfH = halfW / aspect;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (const s of slots) {
      minX = Math.min(minX, s.xNorm - halfW);
      maxX = Math.max(maxX, s.xNorm + halfW);
      minY = Math.min(minY, s.yNorm - halfH);
      maxY = Math.max(maxY, s.yNorm + halfH);
    }

    const cw = maxX - minX;
    const ch = maxY - minY;
    if (cw <= 0 || ch <= 0) break;

    const fit = Math.min(availW / cw, availH / ch, 1);
    if (fit >= 0.996) break;
    diameter *= fit * 0.97;
  }

  const halfW = diameter / 2;
  const halfH = halfW / aspect;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of slots) {
    minX = Math.min(minX, s.xNorm - halfW);
    maxX = Math.max(maxX, s.xNorm + halfW);
    minY = Math.min(minY, s.yNorm - halfH);
    maxY = Math.max(maxY, s.yNorm + halfH);
  }

  const cw = Math.max(maxX - minX, 1e-6);
  const ch = Math.max(maxY - minY, 1e-6);

  const tileW = diameter * rectW;
  const tileH = (diameter / aspect) * rectH;
  const layerOffsetX = isMobile ? rectW * -0.0012 : -3;
  const layerOffsetY = isMobile ? rectH * -0.0016 : -4;

  const mapPosition = (xNorm: number, yNorm: number, layer: number) => ({
    x:
      rectX +
      padX * rectW +
      ((xNorm - minX) / cw) * availW * rectW +
      layer * layerOffsetX,
    y:
      rectY +
      padTop * rectH +
      ((yNorm - minY) / ch) * availH * rectH +
      layer * layerOffsetY,
  });

  return { tileW, tileH, mapPosition };
}

export function getBoardArea(
  width: number,
  height: number
): { x: number; y: number; w: number; h: number } {
  const margin = width < 640 ? 4 : 10;
  return {
    x: margin,
    y: margin,
    w: width - margin * 2,
    h: height - margin * 2,
  };
}
