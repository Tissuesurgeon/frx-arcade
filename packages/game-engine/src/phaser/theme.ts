/** Valorant + Steam esports + mobile puzzle palette */
export const THEME = {
  bgDeep: 0x0a0e14,
  bgMid: 0x0f1923,
  bgPanel: 0x1a2332,
  valorantRed: 0xff4655,
  valorantRedDim: 0xcc3642,
  hudCyan: 0x26d0ff,
  hudCyanDim: 0x1a9fbf,
  steamBlue: 0x66c0f4,
  accentGold: 0xffc84d,
  text: 0xece8e1,
  textMuted: 0x8b9bb4,
  shadow: 0x000000,
  glowSelectable: 0x26d0ff,
  glowMatch: 0xff4655,
  boardVignette: 0x000000,
  gridLine: 0xffffff,
} as const;

export const FONT = {
  display: '"DIN Next", "Rajdhani", "Segoe UI", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Roboto Mono", ui-monospace, monospace',
} as const;

export const MOBILE_BREAK = 640;
export const TILE_ASPECT = 0.82;
export const MOBILE_TILE_SCALE = 0.92;

/** Layer stack depth — stronger offset = more cognitive pressure */
export const LAYER_OFFSET_X = -4.5;
export const LAYER_OFFSET_Y = -5.5;
export const MOBILE_LAYER_OFFSET_X = -3;
export const MOBILE_LAYER_OFFSET_Y = -3.8;

export const EASE = {
  fly: "Back.easeOut",
  flyDuration: 420,
  matchShrink: 280,
  hover: "Sine.easeInOut",
} as const;
