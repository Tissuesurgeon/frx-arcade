import * as Phaser from "phaser";
import { FONT, THEME } from "./theme";

/** Minimal stage frame — matches React TileGrid mobile/desktop shells. */
export function drawBoardStage(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  isMobile: boolean
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  const radius = isMobile ? 12 : 16;

  if (isMobile) {
    g.fillStyle(THEME.stageMobileTop, 1);
    g.fillGradientStyle(
      THEME.stageMobileTop,
      THEME.stageMobileTop,
      THEME.stageMobileBottom,
      THEME.stageMobileBottom,
      1
    );
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, 0x14532d, 0.55);
    g.strokeRoundedRect(x, y, w, h, radius);
  } else {
    g.fillStyle(THEME.stageDesktop, 0.92);
    g.fillRoundedRect(x, y, w, h, radius);
    g.lineStyle(1, THEME.stageBorder, THEME.stageBorderAlpha);
    g.strokeRoundedRect(x, y, w, h, radius);
  }

  g.setDepth(0);
  return g;
}

export function drawBackground(
  scene: Phaser.Scene,
  width: number,
  height: number
): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillGradientStyle(THEME.bgTop, THEME.bgTop, THEME.bgBottom, THEME.bgBottom, 1);
  g.fillRect(0, 0, width, height);
  g.setDepth(-10);
  return g;
}

export function drawStageLabel(
  scene: Phaser.Scene,
  x: number,
  y: number
): Phaser.GameObjects.Text {
  return scene.add
    .text(x, y, "Match 3 in the tray", {
      fontFamily: FONT.family,
      fontSize: "11px",
      color: "#64748b",
    })
    .setOrigin(0, 0)
    .setDepth(1)
    .setAlpha(0.85);
}
