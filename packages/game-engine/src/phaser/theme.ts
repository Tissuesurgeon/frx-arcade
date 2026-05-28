/** React UI palette — matches apps/web globals.css + Tailwind game components */

export const THEME = {
  bgTop: 0x0b0f1a,
  bgBottom: 0x0d1324,
  panelFill: 0xffffff,
  panelFillAlpha: 0.04,
  borderWhiteAlpha: 0.1,
  textPrimary: 0xffffff,
  textMuted: 0x94a3b8,
  textSlate300: 0xcbd5e1,
  timerUrgentBorder: 0xef4444,
  timerUrgentBg: 0x450a0a,
  timerUrgentText: 0xfca5a5,
  chipBg: 0xffffff,
  chipBgAlpha: 0.04,
  mobileBoardTop: 0x27654a,
  mobileBoardBottom: 0x1f4d38,
  mobileBoardBorder: 0x14532d,
  desktopBoardBg: 0x0b0f1a,
  desktopBoardBgAlpha: 0.9,
  trayDanger: 0xef4444,
  trayDangerBg: 0x450a0a,
  shuffleViolet: 0x8b5cf6,
  shuffleVioletDark: 0x6d28d9,
  shuffleDisabled: 0x64748b,
  shadow: 0x000000,
  starIndigo: 0x6366f1,
  starCyan: 0x22d3ee,
  starViolet: 0xa78bfa,
} as const;

export const FONT = {
  sans: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: '"JetBrains Mono", "Roboto Mono", ui-monospace, monospace',
} as const;

export const MOBILE_BREAK = 640;
export const MOBILE_TILE_SCALE = 0.9;
export const MOBILE_TILE_ASPECT = 0.82;
export const MOBILE_LAYER_OFFSET_X_PCT = -0.12;
export const MOBILE_LAYER_OFFSET_Y_PCT = -0.16;

export const EASE = {
  fly: "Sine.easeInOut",
  flyDuration: 320,
  matchShrink: 280,
  hover: "Sine.easeInOut",
  shufflePulse: 450,
} as const;
