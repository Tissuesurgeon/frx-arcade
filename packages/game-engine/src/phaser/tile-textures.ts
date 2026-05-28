import * as Phaser from "phaser";
import { TILE_FACE_COUNT } from "../logic/constants";
import { phaserTileColors } from "../logic/phaser-colors";
import { tileLabel, tileMatchKey } from "../logic/tile-styles";
import { FONT, THEME } from "./theme";

const TEXTURE_PREFIX = "frx-tile-v3";

export function tileTextureKey(faceKey: number, w: number, h: number): string {
  return `${TEXTURE_PREFIX}-${faceKey}-${Math.round(w)}x${Math.round(h)}`;
}

export function ensureTileTextures(
  scene: Phaser.Scene,
  tileW: number,
  tileH: number
): void {
  const w = Math.max(30, Math.round(tileW));
  const h = Math.max(36, Math.round(tileH));
  const radius = Math.max(8, Math.min(12, w * 0.22));

  for (let face = 0; face < TILE_FACE_COUNT; face++) {
    const key = tileTextureKey(face, w, h);
    if (scene.textures.exists(key)) continue;

    const g = scene.make.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    const c = phaserTileColors(face);

    g.fillStyle(THEME.shadow, 0.5);
    g.fillRoundedRect(5, 7, w, h, radius);
    g.fillStyle(THEME.shadow, 0.25);
    g.fillRoundedRect(3, 5, w, h, radius);

    g.fillStyle(c.stroke, 0.9);
    g.fillRoundedRect(1, h - 5, w - 2, 5, { bl: radius, br: radius, tl: 0, tr: 0 });

    g.fillGradientStyle(c.fillTop, c.fillTop, c.fill, c.fillDeep, 1);
    g.fillRoundedRect(0, 0, w, h - 4, radius);

    g.lineStyle(1.5, c.stroke, 0.5);
    g.strokeRoundedRect(1, 1, w - 2, h - 6, radius - 1);

    g.fillStyle(0xffffff, 0.32);
    g.fillRoundedRect(3, 3, w - 6, h * 0.2, radius - 2);

    const cx = w / 2;
    const cy = h / 2 - 1;
    const diskR = Math.min(w, h) * 0.26;
    g.fillGradientStyle(c.accent, c.accent, c.fill, c.fillDeep, 1);
    g.fillCircle(cx, cy, diskR);
    g.lineStyle(2, 0xffffff, 0.35);
    g.strokeCircle(cx, cy, diskR);

    g.generateTexture(key, w + 8, h + 10);
    g.destroy();
  }
}

export function createRichTile(
  scene: Phaser.Scene,
  type: number,
  tileW: number,
  tileH: number,
  layer: number,
  selectable: boolean
): Phaser.GameObjects.Container {
  const face = tileMatchKey(type);
  ensureTileTextures(scene, tileW, tileH);
  const key = tileTextureKey(face, tileW, tileH);
  const colors = phaserTileColors(type);

  const container = scene.add.container(0, 0);
  container.setData("tileW", tileW);
  container.setData("tileH", tileH);
  container.setData("layer", layer);

  const depthShadow = scene.add.graphics();
  const ds = 2 + layer * 1.8;
  depthShadow.fillStyle(THEME.shadow, 0.35 + layer * 0.04);
  depthShadow.fillRoundedRect(-tileW / 2 + ds, -tileH / 2 + ds, tileW, tileH, 10);

  const glow = scene.add.graphics();
  glow.setBlendMode(Phaser.BlendModes.ADD);

  const body = scene.add.image(0, 0, key);
  body.setOrigin(0.5, 0.5);

  const label = scene.add.text(0, 0, tileLabel(type), {
    fontFamily: FONT.mono,
    fontSize: `${Math.max(13, Math.floor(tileW * 0.38))}px`,
    color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
    fontStyle: "bold",
    stroke: "#00000055",
    strokeThickness: 2,
  });
  label.setOrigin(0.5, 0.5);

  container.add([depthShadow, glow, body, label]);
  container.setData("selectable", selectable);
  container.setData("glow", glow);

  applyTileVisualState(container, selectable, false);
  return container;
}

export function applyTileVisualState(
  container: Phaser.GameObjects.Container,
  selectable: boolean,
  hovered: boolean
): void {
  const glow = container.getData("glow") as Phaser.GameObjects.Graphics;
  const tileW = (container.getData("tileW") as number) || 40;
  const tileH = (container.getData("tileH") as number) || 48;
  const layer = (container.getData("layer") as number) ?? 0;

  if (!selectable) {
    container.setAlpha(0.26 + Math.min(layer, 4) * 0.02);
    container.setScale(0.93);
    glow.clear();
    return;
  }

  container.setAlpha(1);
  container.setScale(hovered ? 1.1 : 1.05);

  glow.clear();
  const pad = hovered ? 6 : 4;
  glow.lineStyle(hovered ? 3 : 2, THEME.glowSelectable, hovered ? 0.95 : 0.5);
  glow.strokeRoundedRect(-tileW / 2 - pad, -tileH / 2 - pad, tileW + pad * 2, tileH + pad * 2, 14);
  if (hovered) {
    glow.fillStyle(THEME.glowSelectable, 0.14);
    glow.fillRoundedRect(-tileW / 2 - pad, -tileH / 2 - pad, tileW + pad * 2, tileH + pad * 2, 14);
  }
}
