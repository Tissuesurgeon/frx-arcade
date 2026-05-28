import { buildSlotPositions, getTileDiameterNorm } from "../logic/layout";

export type BoardTransform = {
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  tileW: number;
  tileH: number;
  layerOffsetX: number;
  layerOffsetY: number;
  mapPosition: (xNorm: number, yNorm: number, layer: number) => { x: number; y: number };
};

export function computeBoardTransform(
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  isMobile: boolean
): BoardTransform {
  const slots = buildSlotPositions();
  const padX = isMobile ? 0.035 : 0.055;
  const padTop = isMobile ? 0.015 : 0.035;
  const padBottom = isMobile ? 0.025 : 0.04;
  const availW = 1 - 2 * padX;
  const availH = 1 - padTop - padBottom;
  const aspect = 0.82;

  let diameter = getTileDiameterNorm() * (isMobile ? 0.86 : 0.92);

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
    diameter *= fit * 0.985;
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
  const layerOffsetX = isMobile ? -2.2 : -3.2;
  const layerOffsetY = isMobile ? -2.8 : -4;

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

  return {
    rectX,
    rectY,
    rectW,
    rectH,
    tileW,
    tileH,
    layerOffsetX,
    layerOffsetY,
    mapPosition,
  };
}

export function getBoardFrameRect(
  width: number,
  height: number,
  trayZoneH: number,
  actionZoneH: number
): { x: number; y: number; w: number; h: number } {
  const margin = Math.max(8, width * 0.02);
  const top = margin;
  const bottom = height - trayZoneH - actionZoneH - margin;
  return {
    x: margin,
    y: top,
    w: width - margin * 2,
    h: Math.max(100, bottom - top),
  };
}
