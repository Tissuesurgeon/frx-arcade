import * as Phaser from "phaser";
import { TILE_FACE_COUNT } from "../logic/constants";
import { phaserTileColors } from "../logic/phaser-colors";
import { tileLabel, tileMatchKey } from "../logic/tile-styles";
import { FONT, THEME } from "./theme";

const TEXTURE_PREFIX = "frx-tile-v2";

export function tileTextureKey(faceKey: number, w: number, h: number): string {
  return `${TEXTURE_PREFIX}-${faceKey}-${Math.round(w)}x${Math.round(h)}`;
}

/** Pastel gradient tiles — matches React `tileFacePaint` styling. */
export function ensureTileTextures(
  scene: Phaser.Scene,
  tileW: number,
  tileH: number
): void {
  const w = Math.max(28, Math.round(tileW));
  const h = Math.max(34, Math.round(tileH));
  const radius = Math.min(10, w * 0.2);

  for (let face = 0; face < TILE_FACE_COUNT; face++) {
    const key = tileTextureKey(face, w, h);
    if (scene.textures.exists(key)) continue;

    const g = scene.make.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    const colors = phaserTileColors(face);

    // Drop shadow (matches React box-shadow)
    g.fillStyle(THEME.shadow, 0.35);
    g.fillRoundedRect(3, 5, w, h, radius);

    // Bottom edge (3D lip)
    g.fillStyle(colors.stroke, 0.85);
    g.fillRoundedRect(0, h - 4, w, 4, { bl: radius, br: radius, tl: 0, tr: 0 });

    // Body gradient: light top → mid bottom
    g.fillStyle(colors.fill, 1);
    g.fillGradientStyle(
      colors.fillTop,
      colors.fillTop,
      colors.fill,
      colors.fill,
      1
    );
    g.fillRoundedRect(0, 0, w, h - 3, radius);

    // Border
    g.lineStyle(1.5, colors.stroke, 0.55);
    g.strokeRoundedRect(0.5, 0.5, w - 1, h - 4, radius);

    // Top gloss
    g.fillStyle(0xffffff, 0.28);
    g.fillRoundedRect(3, 3, w - 6, h * 0.22, radius - 2);

    g.generateTexture(key, w + 4, h + 8);
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

  const colors = phaserTileColors(type);
  const label = scene.add.text(0, 0, tileLabel(type), {
    fontFamily: FONT.mono,
    fontSize: `${Math.max(12, Math.floor(tileW * 0.36))}px`,
    color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
    fontStyle: "bold",
  });
  label.setOrigin(0.5, 0.5);

  container.add([img, label]);
  container.setData("selectable", selectable);
  container.setAlpha(selectable ? 1 : 0.42);
  if (!selectable) {
    container.setScale(0.97);
  }

  return container;
}

export function setTileHighlight(
  container: Phaser.GameObjects.Container,
  active: boolean
): void {
  if (!(container.getData("selectable") as boolean)) return;
  container.setScale(active ? 1.08 : 1);
  container.setAlpha(active ? 1 : 1);
}
