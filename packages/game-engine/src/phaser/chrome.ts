import * as Phaser from "phaser";
import { FONT, THEME } from "./theme";

export type ChromeLayers = {
  bg: Phaser.GameObjects.Container;
  boardFrame: Phaser.GameObjects.Container;
  trayDock: Phaser.GameObjects.Container;
};

export function drawBackground(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  c.setDepth(-100);

  const g = scene.add.graphics();
  g.fillGradientStyle(THEME.bgTop, THEME.bgTop, THEME.bgBottom, THEME.bgMid, 1);
  g.fillRect(0, 0, width, height);

  // Ambient orbs
  g.fillStyle(THEME.glassLight, 0.08);
  g.fillCircle(width * 0.15, height * 0.12, Math.min(width, height) * 0.22);
  g.fillStyle(THEME.accent, 0.05);
  g.fillCircle(width * 0.85, height * 0.35, Math.min(width, height) * 0.18);

  c.add(g);
  return c;
}

export function drawBoardFrame(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const pad = 6;
  const g = scene.add.graphics();

  // Outer gold rim
  g.lineStyle(3, THEME.frameGold, 0.55);
  g.fillStyle(THEME.feltOuter, 0.95);
  g.fillRoundedRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 16);
  g.strokeRoundedRect(x - pad, y - pad, w + pad * 2, h + pad * 2, 16);

  // Inner felt
  g.fillStyle(THEME.feltInner, 1);
  g.fillRoundedRect(x, y, w, h, 12);

  // Subtle inner highlight
  g.lineStyle(1, THEME.feltHighlight, 0.35);
  g.strokeRoundedRect(x + 2, y + 2, w - 4, h - 4, 10);

  // Corner accents
  g.fillStyle(THEME.frameGoldDim, 0.4);
  const cs = 10;
  g.fillCircle(x + 8, y + 8, cs * 0.35);
  g.fillCircle(x + w - 8, y + 8, cs * 0.35);
  g.fillCircle(x + 8, y + h - 8, cs * 0.35);
  g.fillCircle(x + w - 8, y + h - 8, cs * 0.35);

  c.add(g);
  c.setDepth(0);
  return c;
}

export function drawTrayDock(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number
): Phaser.GameObjects.Container {
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();

  g.fillStyle(THEME.trayBg, 0.92);
  g.fillRoundedRect(x, y, w, h, 18);
  g.lineStyle(1.5, THEME.glassBorder, 0.45);
  g.strokeRoundedRect(x, y, w, h, 18);

  // Glass shine
  g.fillStyle(0xffffff, 0.06);
  g.fillRoundedRect(x + 8, y + 4, w - 16, h * 0.35, 12);

  c.add(g);
  c.setDepth(5000);
  return c;
}

export function createShuffleButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  onClick: () => void
): Phaser.GameObjects.Container {
  const w = 132;
  const h = 44;
  const c = scene.add.container(x, y);

  const bg = scene.add.graphics();
  const drawBg = (hover: boolean) => {
    bg.clear();
    const top = hover ? 0x4f46e5 : 0x4338ca;
    const bot = hover ? 0x6366f1 : 0x3730a3;
    bg.fillGradientStyle(top, top, bot, bot, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
    bg.lineStyle(1.5, THEME.accentGlow, hover ? 0.9 : 0.5);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
  };
  drawBg(false);

  const icon = scene.add.text(-w / 2 + 22, 0, "⟳", {
    fontFamily: FONT.family,
    fontSize: "18px",
    color: "#e0e7ff",
  }).setOrigin(0.5);

  const label = scene.add.text(8, 0, "Shuffle", {
    fontFamily: FONT.family,
    fontSize: "15px",
    color: "#f8fafc",
    fontStyle: "bold",
  }).setOrigin(0.5);

  const badge = scene.add.text(w / 2 - 18, 0, "2", {
    fontFamily: FONT.mono,
    fontSize: "13px",
    color: "#fbbf24",
    fontStyle: "bold",
  }).setOrigin(0.5);

  c.add([bg, icon, label, badge]);
  c.setSize(w, h);
  c.setInteractive(
    new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
    Phaser.Geom.Rectangle.Contains
  );
  c.setDepth(6000);

  c.on("pointerover", () => drawBg(true));
  c.on("pointerout", () => drawBg(false));
  c.on("pointerdown", () => {
    scene.tweens.add({ targets: c, scale: 0.94, duration: 60, yoyo: true, ease: "Quad.easeOut" });
    onClick();
  });

  c.setData("label", label);
  c.setData("badge", badge);
  c.setData("drawBg", drawBg);

  return c;
}

export function updateShuffleButton(
  btn: Phaser.GameObjects.Container,
  remaining: number,
  enabled: boolean
): void {
  const badge = btn.getData("badge") as Phaser.GameObjects.Text;
  badge.setText(String(remaining));
  btn.setAlpha(enabled ? 1 : 0.42);
}

export function drawTraySlot(
  scene: Phaser.Scene,
  x: number,
  y: number,
  size: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(THEME.traySlot, 0.85);
  g.fillRoundedRect(x - size / 2, y - size / 2, size, size, 8);
  g.lineStyle(1, THEME.traySlotBorder, 0.7);
  g.strokeRoundedRect(x - size / 2, y - size / 2, size, size, 8);
  return g;
}
