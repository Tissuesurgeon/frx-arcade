import * as Phaser from "phaser";
import { THEME, FONT } from "./theme";

export function drawEsportsBackground(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillGradientStyle(THEME.bgDeep, THEME.bgDeep, THEME.bgMid, THEME.bgPanel, 1);
  g.fillRect(0, 0, width, height);

  // Valorant-style diagonal accent
  g.fillStyle(THEME.valorantRed, 0.04);
  g.fillTriangle(0, 0, width * 0.55, 0, 0, height * 0.45);

  g.fillStyle(THEME.hudCyan, 0.03);
  g.fillTriangle(width, height, width * 0.4, height, width, height * 0.5);

  g.setDepth(-20);
  return g;
}

export function drawPressureBoard(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const r = 14;

  // Outer HUD bracket frame (Valorant)
  g.lineStyle(2, THEME.valorantRed, 0.75);
  g.strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, THEME.hudCyan, 0.25);
  g.strokeRoundedRect(x + 3, y + 3, w - 6, h - 6, r - 2);

  // Corner brackets
  const bl = 18;
  g.lineStyle(2, THEME.valorantRed, 0.9);
  // TL
  g.beginPath();
  g.moveTo(x, y + bl);
  g.lineTo(x, y);
  g.lineTo(x + bl, y);
  g.strokePath();
  // TR
  g.beginPath();
  g.moveTo(x + w - bl, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w, y + bl);
  g.strokePath();
  // BL
  g.beginPath();
  g.moveTo(x, y + h - bl);
  g.lineTo(x, y + h);
  g.lineTo(x + bl, y + h);
  g.strokePath();
  // BR
  g.beginPath();
  g.moveTo(x + w - bl, y + h);
  g.lineTo(x + w, y + h);
  g.lineTo(x + w, y + h - bl);
  g.strokePath();

  // Inner arena — dark with subtle grid
  g.fillStyle(0x0d1219, 0.95);
  g.fillRoundedRect(x + 6, y + 6, w - 12, h - 12, r - 4);

  g.lineStyle(1, THEME.gridLine, 0.04);
  const gridStep = 24;
  for (let gx = x + 12; gx < x + w - 12; gx += gridStep) {
    g.lineBetween(gx, y + 12, gx, y + h - 12);
  }
  for (let gy = y + 12; gy < y + h - 12; gy += gridStep) {
    g.lineBetween(x + 12, gy, x + w - 12, gy);
  }

  // Vignette overlay (pressure)
  g.fillStyle(THEME.boardVignette, 0.35);
  g.fillRect(x + 6, y + 6, w - 12, h * 0.08);
  g.fillRect(x + 6, y + h - 6 - h * 0.08, w - 12, h * 0.08);
  g.fillRect(x + 6, y + 6, (w - 12) * 0.06, h - 12);
  g.fillRect(x + w - 6 - (w - 12) * 0.06, y + 6, (w - 12) * 0.06, h - 12);

  c.add(g);
  c.setDepth(0);
  return c;
}

export function drawTileCountBadge(
  scene: Phaser.Scene,
  x: number,
  y: number,
  count: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, `${count} TILES`, {
      fontFamily: FONT.mono,
      fontSize: "10px",
      color: "#8b9bb4",
      letterSpacing: 2,
    })
    .setOrigin(0, 0)
    .setDepth(2)
    .setAlpha(0.7);
}
