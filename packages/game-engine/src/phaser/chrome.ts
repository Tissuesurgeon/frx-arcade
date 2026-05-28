import * as Phaser from "phaser";
import { THEME } from "./theme";
import type { LayoutZones, Rect } from "./layout-zones";
import { getBoardStageRect } from "./layout-zones";

export function drawPageBackground(
  scene: Phaser.Scene,
  width: number,
  height: number,
  target?: Phaser.GameObjects.Graphics
): Phaser.GameObjects.Graphics {
  const g = target ?? scene.add.graphics();
  g.clear();
  g.fillGradientStyle(THEME.bgTop, THEME.bgTop, THEME.bgBottom, THEME.bgBottom, 1);
  g.fillRect(0, 0, width, height);

  const dots = [
    { x: width * 0.2, y: height * 0.3, c: THEME.starIndigo, a: 0.12 },
    { x: width * 0.7, y: height * 0.6, c: THEME.starCyan, a: 0.1 },
    { x: width * 0.4, y: height * 0.8, c: THEME.starViolet, a: 0.08 },
  ];
  for (const d of dots) {
    g.fillStyle(d.c, d.a);
    g.fillCircle(d.x, d.y, 2);
  }

  g.setDepth(-100);
  return g;
}

export function drawBoardFrame(
  scene: Phaser.Scene,
  zones: LayoutZones
): Phaser.GameObjects.Container {
  const stage = getBoardStageRect(zones);
  const c = scene.add.container(0, 0);
  const g = scene.add.graphics();
  const r = zones.isMobile ? 12 : zones.width >= 1024 ? 24 : 16;

  if (zones.isMobile) {
    g.fillGradientStyle(
      THEME.mobileBoardTop,
      THEME.mobileBoardTop,
      THEME.mobileBoardBottom,
      THEME.mobileBoardBottom,
      1
    );
    g.fillRoundedRect(stage.x, stage.y, stage.w, stage.h, r);
    g.lineStyle(1, THEME.mobileBoardBorder, 0.5);
    g.strokeRoundedRect(stage.x, stage.y, stage.w, stage.h, r);
    g.fillStyle(THEME.shadow, 0.25);
    g.fillRoundedRect(stage.x + 2, stage.y + 2, stage.w, stage.h, r);
  } else {
    g.fillStyle(THEME.desktopBoardBg, THEME.desktopBoardBgAlpha);
    g.fillRoundedRect(stage.x, stage.y, stage.w, stage.h, r);
    g.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    g.strokeRoundedRect(stage.x, stage.y, stage.w, stage.h, r);
  }

  c.add(g);
  c.setDepth(0);
  return c;
}

export function drawFooterDivider(
  scene: Phaser.Scene,
  zones: LayoutZones,
  target?: Phaser.GameObjects.Graphics
): Phaser.GameObjects.Graphics {
  const g = target ?? scene.add.graphics();
  g.clear();
  if (!zones.isMobile) {
    g.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    g.lineBetween(zones.paddingX, zones.footer.y, zones.width - zones.paddingX, zones.footer.y);
  }
  g.setDepth(1);
  return g;
}

export function boardInnerRect(stage: Rect, isMobile: boolean): Rect {
  const pad = isMobile ? 4 : 10;
  return {
    x: stage.x + pad,
    y: stage.y + pad,
    w: stage.w - pad * 2,
    h: stage.h - pad * 2,
  };
}
