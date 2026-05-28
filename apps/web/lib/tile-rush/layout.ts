import type { BoardPosition } from "./types";
import { TOTAL_TILES } from "./constants";

const TURTLE_TILE_COUNT = 144;

/**
 * Classic **Mahjong solitaire “Turtle”** (144 tiles) plus **gap-fill** slots in the same footprint
 * so the board uses empty grid space inside the turtle bbox (harder, same viewport).
 * @see https://github.com/cheshire137/Mahjong/blob/master/layouts/turtle.txt
 * @see https://en.wikipedia.org/wiki/Mahjong_solitaire
 */
const TURTLE_LAYOUT_TEXT = `
0,7,0;
2,0,0;2,6,0;2,8,0;2,14,0;
4,0,0;4,4,0;4,6,0;4,8,0;4,10,0;4,14,0;
6,0,0;6,2,0;6,4,0;6,6,0;6,8,0;6,10,0;6,12,0;6,14,0;
8,0,0;8,2,0;8,4,0;8,6,0;8,8,0;8,10,0;8,12,0;8,14,0;
8,2,1;8,4,1;8,6,1;8,8,1;8,10,1;8,12,1;
10,0,0;10,2,0;10,4,0;10,6,0;10,8,0;10,10,0;10,12,0;10,14,0;
10,2,1;10,4,1;10,6,1;10,8,1;10,10,1;10,12,1;
10,4,2;10,6,2;10,8,2;10,10,2;
12,0,0;12,2,0;12,4,0;12,6,0;12,8,0;12,10,0;12,12,0;12,14,0;
12,2,1;12,4,1;12,6,1;12,8,1;12,10,1;12,12,1;
12,4,2;12,6,2;12,8,2;12,10,2;
12,6,3;12,8,3;
13,7,4;
14,0,0;14,2,0;14,4,0;14,6,0;14,8,0;14,10,0;14,12,0;14,14,0;
14,2,1;14,4,1;14,6,1;14,8,1;14,10,1;14,12,1;
14,4,2;14,6,2;14,8,2;14,10,2;
14,6,3;14,8,3;
16,0,0;16,2,0;16,4,0;16,6,0;16,8,0;16,10,0;16,12,0;16,14,0;
16,2,1;16,4,1;16,6,1;16,8,1;16,10,1;16,12,1;
16,4,2;16,6,2;16,8,2;16,10,2;
18,0,0;18,2,0;18,4,0;18,6,0;18,8,0;18,10,0;18,12,0;18,14,0;
18,2,1;18,4,1;18,6,1;18,8,1;18,10,1;18,12,1;
20,0,0;20,2,0;20,4,0;20,6,0;20,8,0;20,10,0;20,12,0;20,14,0;
22,0,0;22,4,0;22,6,0;22,8,0;22,10,0;22,14,0;
24,0,0;24,6,0;24,8,0;24,14,0;
26,7,0;
28,7,0
`.trim();

/** Geometry in abstract units (tiles are squares). */
export const TILE_UNIT = 1;
export const OVERLAP_RATIO = 0.35;

const LAYOUT_STEP = TILE_UNIT * (1 - OVERLAP_RATIO);

export type LayoutBlueprintEntry = {
  id: string;
  layer: number;
  col: number;
  row: number;
  x: number;
  y: number;
  zIndex: number;
};

type RawSlot = {
  col: number;
  row: number;
  layer: number;
  x: number;
  y: number;
  zIndex: number;
};

function zIndexFor(layer: number, row: number, col: number): number {
  /** Higher `layer` stacks on top; tie-break with row/col for stable paint order. */
  return layer * 250_000 + row * 200 + col;
}

function parseTurtleLayoutText(): RawSlot[] {
  const raw: RawSlot[] = [];
  const parts = TURTLE_LAYOUT_TEXT.split(/;/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const [rs, cs, ls] = p.split(",").map((x) => x.trim());
    const row = Number(rs);
    const col = Number(cs);
    const layer = Number(ls);
    if (![row, col, layer].every((n) => Number.isFinite(n))) {
      throw new Error(`layout: bad turtle triple "${p}"`);
    }
    const x = col * 0.5 * LAYOUT_STEP;
    const y = row * 0.5 * LAYOUT_STEP;
    raw.push({
      row,
      col,
      layer,
      x,
      y,
      zIndex: zIndexFor(layer, row, col),
    });
  }
  return raw;
}

/**
 * Extra tiles on unused `(row,col)` grid points inside the turtle footprint, spaced from existing
 * tile centers so plates stay readable. Deterministic order: nearer turtle “core” first.
 */
function generateGapFillers(base: RawSlot[], count: number): RawSlot[] {
  const usedRc = new Set<string>();
  for (const s of base) {
    usedRc.add(`${s.row},${s.col}`);
  }

  let minFactor = 0.42;
  let sorted: RawSlot[] = [];

  while (minFactor >= 0.28) {
    const minDistSq = (LAYOUT_STEP * minFactor) ** 2;
    const cands: RawSlot[] = [];
    for (let row = 0; row <= 31; row++) {
      for (let col = 0; col <= 17; col++) {
        if (usedRc.has(`${row},${col}`)) continue;
        const x = col * 0.5 * LAYOUT_STEP;
        const y = row * 0.5 * LAYOUT_STEP;
        let ok = true;
        for (const s of base) {
          const dx = x - s.x;
          const dy = y - s.y;
          if (dx * dx + dy * dy < minDistSq) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        for (const s of cands) {
          const dx = x - s.x;
          const dy = y - s.y;
          if (dx * dx + dy * dy < minDistSq) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const layer = 0;
        cands.push({
          row,
          col,
          layer,
          x,
          y,
          zIndex: zIndexFor(layer, row, col),
        });
      }
    }
    cands.sort((a, b) => {
      const da = Math.abs(a.row - 14) + Math.abs(a.col - 7);
      const db = Math.abs(b.row - 14) + Math.abs(b.col - 7);
      if (da !== db) return da - db;
      return a.row - b.row || a.col - b.col;
    });
    sorted = cands;
    if (sorted.length >= count) break;
    minFactor -= 0.02;
  }

  if (sorted.length < count) {
    throw new Error(
      `layout: gap-fill found ${sorted.length} candidates, need ${count} (relax minFactor or grid).`,
    );
  }

  return sorted.slice(0, count);
}

function buildAllRawSlots(): RawSlot[] {
  const base = parseTurtleLayoutText();
  if (base.length !== TURTLE_TILE_COUNT) {
    throw new Error(
      `layout: expected ${TURTLE_TILE_COUNT} turtle tiles, got ${base.length}`,
    );
  }
  const need = TOTAL_TILES - base.length;
  if (need === 0) return base;
  if (need < 0) {
    throw new Error(`layout: TOTAL_TILES ${TOTAL_TILES} < turtle ${TURTLE_TILE_COUNT}`);
  }
  const fillers = generateGapFillers(base, need);
  return [...base, ...fillers];
}

function normalizeRawSlots(raw: RawSlot[]): {
  slots: BoardPosition[];
  tileHalfExtentNorm: number;
} {
  if (raw.length === 0) {
    return { slots: [], tileHalfExtentNorm: 0.04 };
  }

  const halfPad = TILE_UNIT / 2;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const s of raw) {
    minX = Math.min(minX, s.x - halfPad);
    maxX = Math.max(maxX, s.x + halfPad);
    minY = Math.min(minY, s.y - halfPad);
    maxY = Math.max(maxY, s.y + halfPad);
  }

  const bboxW = maxX - minX;
  const bboxH = maxY - minY;
  const scale = bboxW > 0 && bboxH > 0 ? 1 / Math.max(bboxW, bboxH) : 1;

  const tileHalfExtentNorm = (TILE_UNIT * scale) / 2;

  const normW = bboxW * scale;
  const normH = bboxH * scale;
  const offX = (1 - normW) / 2;
  const offY = (1 - normH) / 2;

  const slots: BoardPosition[] = raw.map((s) => ({
    col: s.col,
    row: s.row,
    layer: s.layer,
    xNorm: (s.x - minX) * scale + offX,
    yNorm: (s.y - minY) * scale + offY,
    zIndex: s.zIndex,
  }));

  return { slots, tileHalfExtentNorm };
}

const LAYOUT_GEOMETRY_VERSION = 7;
let _cachedVersion = -1;
let _cachedSlots: BoardPosition[] | null = null;
let _cachedHalf: number | null = null;

function getNormalizedLayout(): {
  slots: BoardPosition[];
  tileHalfExtentNorm: number;
} {
  if (
    _cachedSlots &&
    _cachedHalf !== null &&
    _cachedVersion === LAYOUT_GEOMETRY_VERSION
  ) {
    return { slots: _cachedSlots, tileHalfExtentNorm: _cachedHalf };
  }
  const raw = buildAllRawSlots();
  const { slots, tileHalfExtentNorm } = normalizeRawSlots(raw);
  _cachedSlots = slots;
  _cachedHalf = tileHalfExtentNorm;
  _cachedVersion = LAYOUT_GEOMETRY_VERSION;
  return { slots, tileHalfExtentNorm };
}

function assertValidSlots(slots: BoardPosition[]): void {
  if (slots.length !== TOTAL_TILES) {
    throw new Error(
      `layout: expected ${TOTAL_TILES} slots, got ${slots.length}. Check turtle layout vs TILE_TYPES.`,
    );
  }
  const seen = new Set<string>();
  for (const { col, row, layer } of slots) {
    if (row < 0 || col < 0 || layer < 0) {
      throw new Error(`layout: bad row/col/layer ${row}/${col}/${layer}`);
    }
    const key = `${layer},${col},${row}`;
    if (seen.has(key)) {
      throw new Error(`layout: duplicate slot ${key}`);
    }
    seen.add(key);
  }
}

/** Half side of a square tile in normalized board coordinates (0–1 scale). */
export function getTileHalfExtentNorm(): number {
  return getNormalizedLayout().tileHalfExtentNorm;
}

/** Tile edge length as a fraction of the board span (for CSS width in %). */
export function getTileDiameterNorm(): number {
  return getTileHalfExtentNorm() * 2;
}

export type MobileBoardFit = {
  tileDiameterPct: number;
  mapPosition: (xNorm: number, yNorm: number) => { leftPct: number; topPct: number };
};

/**
 * Fit the full turtle layout into a mobile board: top-aligned, horizontally
 * distributed, tiles shrunk until every tile edge stays inside the frame.
 */
export function computeMobileBoardFit(
  tileScale: number,
  tileAspect: number
): MobileBoardFit {
  const slots = buildSlotPositions();
  const padX = 0.028;
  const padTop = 0.01;
  const padBottom = 0.016;
  const availW = 1 - 2 * padX;
  const availH = 1 - padTop - padBottom;

  let diameter = getTileDiameterNorm() * tileScale;

  for (let i = 0; i < 10; i++) {
    const halfW = diameter / 2;
    const halfH = halfW / tileAspect;
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
    if (fit >= 0.992) break;
    diameter *= fit * 0.97;
  }

  const halfW = diameter / 2;
  const halfH = halfW / tileAspect;
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

  const mapPosition = (xNorm: number, yNorm: number) => ({
    leftPct: (padX + ((xNorm - minX) / cw) * availW) * 100,
    topPct: (padTop + ((yNorm - minY) / ch) * availH) * 100,
  });

  return {
    tileDiameterPct: diameter * 100,
    mapPosition,
  };
}

/** Game slots with normalized centers in [0, 1] (square fit). */
export function buildSlotPositions(): BoardPosition[] {
  const { slots } = getNormalizedLayout();
  if (process.env.NODE_ENV !== "production") {
    assertValidSlots(slots);
  } else if (slots.length !== TOTAL_TILES) {
    throw new Error(`layout: expected ${TOTAL_TILES} slots, got ${slots.length}`);
  }
  return slots;
}

/** Exact blueprint: `{ id, layer, col, row, x, y, zIndex }` in normalized coords. */
export function exportLayoutBlueprint(): LayoutBlueprintEntry[] {
  const slots = buildSlotPositions();
  return slots.map((s, i) => ({
    id: `L${s.layer}-c${s.col}-r${s.row}-${i}`,
    layer: s.layer,
    col: s.col,
    row: s.row,
    x: s.xNorm,
    y: s.yNorm,
    zIndex: s.zIndex,
  }));
}

export function rectNorm(
  tile: Pick<BoardPosition, "xNorm" | "yNorm">,
  halfW: number,
  halfH: number,
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: tile.xNorm - halfW,
    top: tile.yNorm - halfH,
    right: tile.xNorm + halfW,
    bottom: tile.yNorm + halfH,
  };
}

export function rectsIntersect(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): boolean {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

/** Axis overlap / min edge length, for “meaningful” cover (not corner kisses). */
export function rectOverlapDepth(
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number },
): { x: number; y: number } {
  const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
  return { x: Math.max(0, x), y: Math.max(0, y) };
}
