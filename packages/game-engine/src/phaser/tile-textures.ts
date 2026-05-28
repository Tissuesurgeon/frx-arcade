import * as Phaser from "phaser";
import { TILE_FACE_COUNT } from "../logic/constants";
import { phaserTileColors } from "../logic/phaser-colors";
import { tileLabel, tileMatchKey } from "../logic/tile-styles";
import { FONT, THEME } from "./theme";

const TEXTURE_PREFIX = "frx-tile";

export function tileTextureKey(faceKey: number, w: number, h: number): string {
  return `${TEXTURE_PREFIX}-${faceKey}-${Math.round(w)}x${Math.round(h)}`;
}

/** Procedural mahjong-style tile textures (cached per face + size). */
export function ensureTileTextures(
  scene: Phaser.Scene,
  tileW: number,
  tileH: number
): void {
  const w = Math.max(24, Math.round(tileW));
  const h = Math.max(28, Math.round(tileH));
  const radius = Math.min(8, w * 0.18);

  for (let face = 0; face < TILE_FACE_COUNT; face++) {
    const key = tileTextureKey(face, w, h);
    if (scene.textures.exists(key)) continue;

    const g = scene.make.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    const colors = phaserTileColors(face);

    // Drop shadow
    g.fillStyle(THEME.shadow, 0.45);
    g.fillRoundedRect(4, 5, w, h, radius);

    // Side depth (3D stack lip)
    g.fillStyle(0xcbd5e1, 1);
    g.fillRoundedRect(2, 2, w, h, radius);

    // Main ivory body
    g.fillStyle(0xf8fafc, 1);
    g.fillRoundedRect(0, 0, w - 2, h - 2, radius);

    // Inner tint wash
    g.fillStyle(colors.fill, 0.22);
    g.fillRoundedRect(3, 3, w - 8, h - 8, radius - 2);

    // Top gloss
    g.fillStyle(0xffffff, 0.35);
    g.fillRoundedRect(4, 4, w - 12, h * 0.22, radius - 2);

    // Symbol disk
    const cx = (w - 2) / 2;
    const cy = (h - 2) / 2;
    const diskR = Math.min(w, h) * 0.28;
    g.fillStyle(colors.fill, 1);
    g.fillCircle(cx, cy, diskR);
    g.lineStyle(2, colors.stroke, 0.85);
    g.strokeCircle(cx, cy, diskR);

    g.generateTexture(key, w + 6, h + 8);
    g.destroy();
  }
}

export function addTileSprite(
  scene: Phaser.Scene,
  type: number,
  tileW: number,
  tileH: number,
  selectable: boolean
): Phaser.GameObjects.Container {
  const face = tileMatchKey(type);
  const key = tileTextureKey(face, tileW, tileH);
  ensureTileTextures(scene, tileW, tileH);

  const container = scene.add.container(0, 0);
  const img = scene.add.image(0, 0, key);
  img.setOrigin(0.5, 0.5);

  const label = scene.add.text(0, 1, tileLabel(type), {
    fontFamily: FONT.family,
    fontSize: `${Math.max(11, Math.floor(tileW * 0.34))}px`,
    color: "#ffffff",
    fontStyle: "bold",
    stroke: "#00000033",
    strokeThickness: 2,
  });
  label.setOrigin(0.5, 0.5);

  container.add([img, label]);

  if (selectable) {
    const glow = scene.add.rectangle(0, 0, tileW + 8, tileH + 8, THEME.accentGlow, 0);
    glow.setStrokeStyle(2, THEME.accentGlow, 0);
    container.addAt(glow, 0);
    container.setData("glow", glow);
  }

  container.setData("selectable", selectable);
  container.setAlpha(selectable ? 1 : 0.42);
  if (!selectable) {
    container.setScale(0.96);
  }

  return container;
}

export function setTileHighlight(
  container: Phaser.GameObjects.Container,
  active: boolean
): void {
  const glow = container.getData("glow") as Phaser.GameObjects.Rectangle | undefined;
  if (!glow) return;
  glow.setFillStyle(THEME.accentGlow, active ? 0.12 : 0);
  glow.setStrokeStyle(2, THEME.accentGlow, active ? 0.85 : 0);
  container.setScale(active ? 1.06 : 1);
}
