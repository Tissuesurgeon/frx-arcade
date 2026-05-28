import * as Phaser from "phaser";
import { FONT, THEME } from "./theme";
import type { LayoutZones } from "./layout-zones";

export type ShuffleCallbacks = {
  onShuffle: () => void;
};

export class ShuffleUI {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private icon: Phaser.GameObjects.Text;
  private badge: Phaser.GameObjects.Graphics;
  private badgeText: Phaser.GameObjects.Text;
  private label: Phaser.GameObjects.Text;
  private hitArea: Phaser.GameObjects.Rectangle;
  private zones: LayoutZones;
  private callbacks: ShuffleCallbacks;
  private active = true;

  constructor(
    scene: Phaser.Scene,
    zones: LayoutZones,
    callbacks: ShuffleCallbacks
  ) {
    this.zones = zones;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0);
    this.bg = scene.add.graphics();
    this.icon = scene.add.text(0, 0, "⇄", {
      fontSize: "24px",
      color: "#ffffff",
    });
    this.badge = scene.add.graphics();
    this.badgeText = scene.add.text(0, 0, "2", {
      fontFamily: FONT.mono,
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.label = scene.add.text(0, 0, "Shuffle", {
      fontFamily: FONT.sans,
      fontSize: "10px",
      color: "#64748b",
    });
    this.hitArea = scene.add.rectangle(0, 0, 48, 48, 0x000000, 0);
    this.hitArea.setInteractive({ useHandCursor: true });
    this.hitArea.on("pointerdown", () => {
      if (this.active) this.callbacks.onShuffle();
    });

    this.container.add([
      this.bg,
      this.icon,
      this.badge,
      this.badgeText,
      this.label,
      this.hitArea,
    ]);
    this.container.setDepth(70);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  layout(zones: LayoutZones): void {
    this.zones = zones;
    const btn = zones.shuffleButton;
    const cx = btn.x + btn.w / 2;
    const cy = btn.y + btn.h / 2;

    this.bg.clear();
    if (this.active) {
      this.bg.fillGradientStyle(
        THEME.shuffleViolet,
        THEME.shuffleViolet,
        THEME.shuffleVioletDark,
        THEME.shuffleVioletDark,
        1
      );
      this.bg.lineStyle(1, 0xa78bfa, 0.5);
    } else {
      this.bg.fillStyle(THEME.panelFill, 0.05);
      this.bg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    }
    this.bg.fillRoundedRect(btn.x, btn.y, btn.w, btn.h, 16);
    this.bg.strokeRoundedRect(btn.x, btn.y, btn.w, btn.h, 16);

    this.icon.setPosition(cx, cy);
    this.icon.setOrigin(0.5, 0.5);
    this.icon.setAlpha(this.active ? 1 : 0.5);

    this.badge.clear();
    this.badge.fillStyle(0x000000, 0.8);
    this.badge.lineStyle(1, THEME.panelFill, 0.2);
    const bx = btn.x + btn.w - 4;
    const by = btn.y + btn.h - 4;
    this.badge.fillCircle(bx, by, 10);
    this.badge.strokeCircle(bx, by, 10);
    this.badgeText.setPosition(bx, by);
    this.badgeText.setOrigin(0.5, 0.5);

    this.label.setPosition(cx, btn.y + btn.h + 12);
    this.label.setOrigin(0.5, 0.5);

    this.hitArea.setPosition(cx, cy);
    this.hitArea.setSize(btn.w, btn.h);
  }

  setState(shufflesLeft: number, disabled: boolean): void {
    this.active = shufflesLeft > 0 && !disabled;
    this.badgeText.setText(String(shufflesLeft));
    this.layout(this.zones);
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
