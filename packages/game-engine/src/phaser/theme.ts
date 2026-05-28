/** Visual theme — dark glass + neon accents (modern mobile tile-match). */
export const THEME = {
  bgTop: 0x07050f,
  bgMid: 0x12101f,
  bgBottom: 0x1a1530,
  feltOuter: 0x0d2818,
  feltInner: 0x14532d,
  feltHighlight: 0x166534,
  frameGold: 0xd4a853,
  frameGoldDim: 0x8b6914,
  glass: 0x1e1b4b,
  glassLight: 0x312e81,
  glassBorder: 0x6366f1,
  accent: 0x22d3ee,
  accentGlow: 0x67e8f9,
  accentWarm: 0xfbbf24,
  danger: 0xf87171,
  text: 0xf8fafc,
  textMuted: 0x94a3b8,
  trayBg: 0x0c1222,
  traySlot: 0x151c2e,
  traySlotBorder: 0x334155,
  shadow: 0x000000,
} as const;

export const FONT = {
  family: '"Segoe UI", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const MOBILE_BREAK = 640;
export const TILE_ASPECT = 0.82;
export const LAYER_OFFSET_X = -3;
export const LAYER_OFFSET_Y = -4;
