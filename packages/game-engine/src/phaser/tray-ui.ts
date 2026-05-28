import * as Phaser from "phaser";
import type { TrayTile } from "../logic/types";
import { FONT, THEME } from "./theme";
import type { LayoutZones } from "./layout-zones";
import { getTraySlotCenter } from "./layout-zones";
import { createTrayTileSprite } from "./tile-textures";

export class TrayUI {
  private container: Phaser.GameObjects.Container;
  private panelBg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private dangerText: Phaser.GameObjects.Text;
  private slotGraphics: Phaser.GameObjects.Graphics;
  private tileSprites = new Map<string, Phaser.GameObjects.Container>();
  private zones: LayoutZones;
  private dangerTween?: Phaser.Tweens.Tween;

  constructor(scene: Phaser.Scene, zones: LayoutZones) {
    this.zones = zones;
    this.container = scene.add.container(0, 0);
    this.panelBg = scene.add.graphics();
    this.label = scene.add.text(0, 0, "Tray · 0/9", {
      fontFamily: FONT.sans,
      fontSize: "12px",
      color: "#94a3b8",
      fontStyle: "bold",
    });
    this.slotGraphics = scene.add.graphics();
    this.dangerText = scene.add.text(0, 0, "Careful — tray almost full!", {
      fontFamily: FONT.sans,
      fontSize: "12px",
      color: "#f87171",
      fontStyle: "bold",
    });
    this.dangerText.setVisible(false);
    this.container.add([
      this.panelBg,
      this.label,
      this.slotGraphics,
      this.dangerText,
    ]);
    this.container.setDepth(60);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  getTileSprite(id: string): Phaser.GameObjects.Container | undefined {
    return this.tileSprites.get(id);
  }

  layout(zones: LayoutZones): void {
    this.zones = zones;
    const panel = zones.trayPanel;
    const r = zones.isMobile ? 12 : 16;

    this.panelBg.clear();
    this.panelBg.fillStyle(THEME.panelFill, THEME.panelFillAlpha);
    this.panelBg.fillRoundedRect(panel.x, panel.y, panel.w, panel.h, r);
    this.panelBg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    this.panelBg.strokeRoundedRect(panel.x, panel.y, panel.w, panel.h, r);

    this.label.setPosition(panel.x + (zones.isMobile ? 8 : 12), panel.y + 8);
    this.dangerText.setPosition(panel.x + panel.w / 2, panel.y + panel.h - 16);
    this.dangerText.setOrigin(0.5, 0.5);

    this.drawEmptySlots(zones);
  }

  private drawEmptySlots(zones: LayoutZones, maxSlots = 9): void {
    this.slotGraphics.clear();
    for (let i = 0; i < maxSlots; i++) {
      const { x, y, slotW, slotH } = getTraySlotCenter(zones, i, maxSlots);
      this.slotGraphics.lineStyle(1, THEME.panelFill, 0.15);
      this.slotGraphics.strokeRoundedRect(
        x - slotW / 2,
        y - slotH / 2,
        slotW,
        slotH,
        6
      );
      this.slotGraphics.fillStyle(0x000000, 0.25);
      this.slotGraphics.fillRoundedRect(
        x - slotW / 2,
        y - slotH / 2,
        slotW,
        slotH,
        6
      );
    }
  }

  renderTray(
    scene: Phaser.Scene,
    tray: TrayTile[],
    maxSlots: number
  ): void {
    const warnThreshold = Math.max(1, maxSlots - 2);
    const danger = tray.length >= warnThreshold;

    this.label.setText(`Tray · ${tray.length}/${maxSlots}`);
    this.drawEmptySlots(this.zones, maxSlots);

    const currentIds = new Set(tray.map((t) => t.id));
    for (const [id, spr] of this.tileSprites) {
      if (!currentIds.has(id)) {
        spr.destroy();
        this.tileSprites.delete(id);
      }
    }

    tray.forEach((tile, slotIndex) => {
      if (slotIndex >= maxSlots) return;
      const { x, y, slotW, slotH } = getTraySlotCenter(
        this.zones,
        slotIndex,
        maxSlots
      );

      let spr = this.tileSprites.get(tile.id);
      if (!spr) {
        spr = createTrayTileSprite(scene, tile.type, slotW, slotH);
        spr.setScale(0.6);
        spr.setAlpha(0);
        scene.tweens.add({
          targets: spr,
          scale: 1,
          alpha: 1,
          duration: 200,
          ease: "Back.easeOut",
        });
        this.container.add(spr);
        this.tileSprites.set(tile.id, spr);
      }
      spr.setPosition(x, y);
      spr.setDepth(61 + slotIndex);
    });

    this.dangerText.setVisible(danger);
    this.dangerTween?.stop();
    const panel = this.zones.trayPanel;
    const r = this.zones.isMobile ? 12 : 16;

    if (danger) {
      this.panelBg.clear();
      this.panelBg.fillStyle(THEME.trayDangerBg, 0.2);
      this.panelBg.fillRoundedRect(panel.x, panel.y, panel.w, panel.h, r);
      this.panelBg.lineStyle(1, THEME.trayDanger, 0.45);
      this.panelBg.strokeRoundedRect(panel.x, panel.y, panel.w, panel.h, r);
    } else {
      this.panelBg.clear();
      this.panelBg.fillStyle(THEME.panelFill, THEME.panelFillAlpha);
      this.panelBg.fillRoundedRect(panel.x, panel.y, panel.w, panel.h, r);
      this.panelBg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
      this.panelBg.strokeRoundedRect(panel.x, panel.y, panel.w, panel.h, r);
    }
  }

  destroy(): void {
    this.dangerTween?.stop();
    this.container.destroy(true);
    this.tileSprites.clear();
  }
}
