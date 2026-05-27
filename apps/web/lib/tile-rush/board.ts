import {
  TILE_TYPES,
  TILES_PER_TYPE,
  TILE_RUSH_SEED,
} from "./constants";
import {
  buildSlotPositions,
  getTileHalfExtentNorm,
  rectNorm,
} from "./layout";
import { hashStringToSeed, mulberry32, shuffleInPlace } from "./rng";
import { tileMatchKey } from "./tile-styles";
import type { Tile, TileType, TrayTile } from "./types";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `t-${idCounter}`;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

/** Multiset: TILE_TYPES × TILES_PER_TYPE (tray clears triples by face digit / `tileMatchKey`). */
export function buildTypeBag(): TileType[] {
  const bag: TileType[] = [];
  for (let t = 0; t < TILE_TYPES; t++) {
    for (let i = 0; i < TILES_PER_TYPE; i++) {
      bag.push(t);
    }
  }
  return bag;
}

export function createInitialBoard(attemptIndex: number): Tile[] {
  resetIdCounter();
  const seedStr = `${TILE_RUSH_SEED}:attempt:${attemptIndex}`;
  const rng = mulberry32(hashStringToSeed(seedStr));
  const bag = buildTypeBag();
  shuffleInPlace(bag, rng);
  const slots = buildSlotPositions();
  return slots.map((pos, i) => ({
    id: nextId(),
    type: bag[i]!,
    col: pos.col,
    row: pos.row,
    layer: pos.layer,
    xNorm: pos.xNorm,
    yNorm: pos.yNorm,
    zIndex: pos.zIndex,
  }));
}

/** Permute types among current board tiles (same slots & ids; tray unchanged). */
export function shuffleBoardTileTypes(boardTiles: Tile[]): Tile[] {
  if (boardTiles.length === 0) return boardTiles;
  const seed = Math.floor(Math.random() * 0x1_0000_0000);
  const rng = mulberry32(seed);
  const types = boardTiles.map((t) => t.type);
  shuffleInPlace(types, rng);
  return boardTiles.map((t, i) => ({ ...t, type: types[i]! }));
}

/** Playable iff no tile with higher z-index covers this tile’s center (matches stacked paint order). */
export function isTileSelectable(tile: Tile, boardTiles: Tile[]): boolean {
  if (!boardTiles.some((t) => t.id === tile.id)) return false;
  return getSelectableTileIds(boardTiles).has(tile.id);
}

function pointInRect(
  px: number,
  py: number,
  r: { left: number; top: number; right: number; bottom: number },
): boolean {
  return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
}

/**
 * Tile is playable iff no remaining tile with strictly higher z-index covers its center
 * (same geometry as `rectNorm` / `getTileHalfExtentNorm`).
 */
export function getSelectableTileIds(boardTiles: Tile[]): Set<string> {
  if (boardTiles.length === 0) return new Set();
  const half = getTileHalfExtentNorm();
  const rects = new Map<string, ReturnType<typeof rectNorm>>();
  for (const t of boardTiles) {
    rects.set(t.id, rectNorm(t, half, half));
  }

  const sorted = [...boardTiles].sort((a, b) => a.zIndex - b.zIndex);
  const selectable = new Set<string>();

  for (const a of sorted) {
    let covered = false;
    for (const b of boardTiles) {
      if (b.id === a.id) continue;
      if (b.zIndex <= a.zIndex) continue;
      const rb = rects.get(b.id)!;
      if (pointInRect(a.xNorm, a.yNorm, rb)) {
        covered = true;
        break;
      }
    }
    if (!covered) selectable.add(a.id);
  }
  return selectable;
}

/** Insert a tile and group all tray tiles by face number (same digit together). */
export function groupTrayByMatchKey(tray: TrayTile[]): TrayTile[] {
  const order: number[] = [];
  const groups = new Map<number, TrayTile[]>();
  for (const t of tray) {
    const k = tileMatchKey(t.type);
    if (!groups.has(k)) {
      groups.set(k, []);
      order.push(k);
    }
    groups.get(k)!.push(t);
  }
  return order.flatMap((k) => groups.get(k)!);
}

export function addTileToTrayGrouped(
  tray: TrayTile[],
  tile: TrayTile,
): TrayTile[] {
  return groupTrayByMatchKey([...tray, tile]);
}

/** First face-number group (match key 0..TILE_FACE_COUNT-1) with ≥3 tiles in tray, or null. */
export function findTripleMatchKey(tray: TrayTile[]): number | null {
  const counts = new Map<number, number>();
  for (const x of tray) {
    const k = tileMatchKey(x.type);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  for (const [key, n] of counts) {
    if (n >= 3) return key;
  }
  return null;
}

/** Remove first three tiles with the same `tileMatchKey` (left-to-right). */
export function removeTripleByMatchKey(tray: TrayTile[], key: number): TrayTile[] {
  let removed = 0;
  return tray.filter((x) => {
    if (tileMatchKey(x.type) === key && removed < 3) {
      removed += 1;
      return false;
    }
    return true;
  });
}

/**
 * Resolve all triples in tray until none left. Returns updated tray and number of matches scored.
 */
export function resolveTriples(tray: TrayTile[]): { tray: TrayTile[]; matches: number } {
  let matches = 0;
  let current = tray;
  let key = findTripleMatchKey(current);
  while (key !== null) {
    current = removeTripleByMatchKey(current, key);
    matches += 1;
    key = findTripleMatchKey(current);
  }
  return { tray: current, matches };
}

/** True if no face-digit group has 3+ tiles (stuck tray). */
export function trayHasNoTriple(tray: TrayTile[]): boolean {
  return findTripleMatchKey(tray) === null;
}

/** After moves: lose if tray is at/above capacity and cannot triple. */
export function isTrayStuck(tray: TrayTile[], trayMax: number): boolean {
  return tray.length >= trayMax && trayHasNoTriple(tray);
}
