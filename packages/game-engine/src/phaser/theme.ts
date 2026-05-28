/** Visual theme aligned with FRX web app (indigo / slate, not casino felt). */
export const THEME = {
  bgTop: 0x0b0a14,
  bgBottom: 0x12101f,
  stageMobileTop: 0x1e4d3a,
  stageMobileBottom: 0x1a3d2e,
  stageDesktop: 0x0f0d18,
  stageBorder: 0xffffff,
  stageBorderAlpha: 0.1,
  accent: 0x22d3ee,
  accentGlow: 0x67e8f9,
  text: 0xf8fafc,
  shadow: 0x000000,
} as const;

export const FONT = {
  family: '"Segoe UI", system-ui, -apple-system, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
} as const;

export const MOBILE_BREAK = 640;
export const TILE_ASPECT = 0.82;
/** Match apps/web MOBILE_TILE_VISUAL_SCALE */
export const MOBILE_TILE_SCALE = 0.9;
