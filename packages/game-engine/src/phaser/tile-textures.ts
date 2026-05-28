import * as Phaser from "phaser";
import { TILE_FACE_COUNT } from "../logic/constants";
import { phaserTileColors } from "../logic/phaser-colors";
import { tileLabel, tileMatchKey } from "../logic/tile-styles";
import { FONT, MOBILE_BREAK, THEME } from "./theme";

const TEXTURE_PREFIX = "frx-tile-react";

export function tileTextureKey(faceKey: number, w: number, h: number): string {
  return `${TEXTURE_PREFIX}-${faceKey}-${Math.round(w)}x${Math.round(h)}`;
}

export function ensureTileTextures(
  scene: Phaser.Scene,
  tileW: number,
  tileH: number
): void {
  const w = Math.max(28, Math.round(tileW));
  const h = Math.max(isMobileScene(scene) ? 34 : 28, Math.round(tileH));
  const radius = Math.max(6, Math.min(10, w * 0.18));
  const bottomBorder = isMobileScene(scene) ? 2 : 3;

  for (let face = 0; face < TILE_FACE_COUNT; face++) {
    const key = tileTextureKey(face, w, h);
    if (scene.textures.exists(key)) continue;

    const g = scene.make.graphics({ x: 0, y: 0 });
    g.setVisible(false);
    const c = phaserTileColors(face);

    g.fillStyle(c.borderBottom, 1);
    g.fillRoundedRect(0, h - bottomBorder, w, bottomBorder, {
      bl: radius,
      br: radius,
      tl: 0,
      tr: 0,
    });

    g.fillGradientStyle(c.fillTop, c.fillTop, c.fill, c.fill, 1);
    g.fillRoundedRect(0, 0, w, h - bottomBorder, radius);

    g.lineStyle(1, c.stroke, 0.5);
    g.strokeRoundedRect(0.5, 0.5, w - 1, h - bottomBorder - 0.5, radius - 1);

    g.fillStyle(0xffffff, 0.65);
    g.fillRoundedRect(2, 2, w - 4, Math.max(3, h * 0.12), radius - 2);

    g.generateTexture(key, w + 4, h + 4);
    g.destroy();
  }
}

function isMobileScene(scene: Phaser.Scene): boolean {
  return scene.scale.width < MOBILE_BREAK;
}

export function createBoardTile(
  scene: Phaser.Scene,
  type: number,
  tileW: number,
  tileH: number,
  layer: number,
  selectable: boolean,
  isMobile: boolean
): Phaser.GameObjects.Container {
  const face = tileMatchKey(type);
  ensureTileTextures(scene, tileW, tileH);
  const key = tileTextureKey(face, tileW, tileH);
  const colors = phaserTileColors(type);

  const container = scene.add.container(0, 0);
  container.setData("tileW", tileW);
  container.setData("tileH", tileH);
  container.setData("layer", layer);
  container.setData("selectable", selectable);
  container.setData("isMobile", isMobile);

  const shadow = scene.add.graphics();
  if (isMobile && layer > 0) {
    const ds = 2 + layer * 2;
    shadow.fillStyle(THEME.shadow, 0.28 + layer * 0.06);
    shadow.fillRoundedRect(
      -tileW / 2 + ds,
      -tileH / 2 + ds * 1.5,
      tileW,
      tileH,
      8
    );
  } else if (!isMobile && layer > 0) {
    shadow.lineStyle(1 + layer, 0x6366f1, 0.32);
    shadow.strokeRoundedRect(-tileW / 2 - 1, -tileH / 2 - 1, tileW + 2, tileH + 2, 10);
  }

  const body = scene.add.image(0, 0, key);
  body.setOrigin(0.5, 0.5);

  const fontSize = isMobile
    ? Math.max(11, Math.floor(tileW * 0.38))
    : Math.max(12, Math.floor(tileW * 0.35));

  const label = scene.add.text(0, 0, tileLabel(type), {
    fontFamily: FONT.mono,
    fontSize: `${fontSize}px`,
    color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
    fontStyle: "bold",
  });
  label.setOrigin(0.5, 0.5);

  container.add([shadow, body, label]);
  applyBoardTileVisual(container, selectable, false);
  return container;
}

export function createTrayTileSprite(
  scene: Phaser.Scene,
  type: number,
  slotW: number,
  slotH: number
): Phaser.GameObjects.Container {
  const tileW = slotW * 0.92;
  const tileH = slotH * 0.92;
  ensureTileTextures(scene, tileW, tileH);
  const face = tileMatchKey(type);
  const key = tileTextureKey(face, tileW, tileH);
  const colors = phaserTileColors(type);

  const container = scene.add.container(0, 0);
  const body = scene.add.image(0, 0, key);
  body.setOrigin(0.5, 0.5);

  const label = scene.add.text(0, 0, tileLabel(type), {
    fontFamily: FONT.mono,
    fontSize: `${Math.max(10, Math.floor(tileW * 0.38))}px`,
    color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
    fontStyle: "bold",
  });
  label.setOrigin(0.5, 0.5);
  container.add([body, label]);
  return container;
}

export function applyBoardTileVisual(
  container: Phaser.GameObjects.Container,
  selectable: boolean,
  hovered: boolean
): void {
  const isMobile = container.getData("isMobile") as boolean;

  if (!selectable) {
    container.setAlpha(isMobile ? 0.42 : 0.5);
    container.setScale(1);
    return;
  }

  container.setAlpha(1);
  if (hovered) {
    container.setScale(isMobile ? 1.04 : 1.08);
  } else {
    container.setScale(1);
  }
}
