export type TileType = number;

/** Board slot: `row`/`col` are Turtle layout grid indices (2-step), `layer` is stack height (0 = base). */
export type BoardPosition = {
  col: number;
  row: number;
  layer: number;
  /** Center X in board space [0, 1] after square fit. */
  xNorm: number;
  /** Center Y in board space [0, 1] after square fit. */
  yNorm: number;
  zIndex: number;
};

export type Tile = {
  id: string;
  type: TileType;
  col: number;
  row: number;
  layer: number;
  xNorm: number;
  yNorm: number;
  zIndex: number;
};

export type TrayTile = {
  id: string;
  type: TileType;
};

export type GamePhase = "playing" | "gameOver" | "cleared" | "timeUp";
