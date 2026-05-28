import * as Phaser from "phaser";
import { fullDailyRewardPool } from "@frx/shared";
import { FONT, THEME } from "./theme";
import type { LayoutZones } from "./layout-zones";

export type HudState = {
  score: number;
  attempt: number;
  maxAttempts: number;
  secondsLeft: number;
  tilesLeft: number;
  totalScore?: number;
  rewardPoolCredits?: number;
  playerCount?: number;
  maxPlayers?: number;
  tournamentType?: string;
  soundMuted?: boolean;
};

export type HudCallbacks = {
  onToggleSound?: () => void;
};

export class GameHud {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private attemptLabel: Phaser.GameObjects.Text;
  private attemptValue: Phaser.GameObjects.Text;
  private scoreLabel: Phaser.GameObjects.Text;
  private scoreValue: Phaser.GameObjects.Text;
  private timerBg: Phaser.GameObjects.Graphics;
  private timerText: Phaser.GameObjects.Text;
  private muteBtn: Phaser.GameObjects.Rectangle;
  private muteIcon: Phaser.GameObjects.Text;
  private chipsContainer: Phaser.GameObjects.Container;
  private zones: LayoutZones;
  private callbacks: HudCallbacks;
  private lastScore = -1;

  constructor(
    scene: Phaser.Scene,
    zones: LayoutZones,
    callbacks: HudCallbacks = {}
  ) {
    this.zones = zones;
    this.callbacks = callbacks;
    this.container = scene.add.container(0, 0);
    this.bg = scene.add.graphics();
    this.attemptLabel = scene.add.text(0, 0, "Attempt", {
      fontFamily: FONT.sans,
      fontSize: "12px",
      color: "#94a3b8",
    });
    this.attemptValue = scene.add.text(0, 0, "1/3", {
      fontFamily: FONT.sans,
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.scoreLabel = scene.add.text(0, 0, "Matches", {
      fontFamily: FONT.sans,
      fontSize: "12px",
      color: "#94a3b8",
    });
    this.scoreValue = scene.add.text(0, 0, "0", {
      fontFamily: FONT.sans,
      fontSize: zones.isMobile ? "24px" : "30px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.timerBg = scene.add.graphics();
    this.timerText = scene.add.text(0, 0, "05:00", {
      fontFamily: FONT.mono,
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.muteBtn = scene.add.rectangle(0, 0, 32, 32, 0x000000, 0.25);
    this.muteBtn.setStrokeStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    this.muteBtn.setInteractive({ useHandCursor: true });
    this.muteBtn.on("pointerdown", () => this.callbacks.onToggleSound?.());
    this.muteIcon = scene.add.text(0, 0, "🔊", { fontSize: "14px" });
    this.chipsContainer = scene.add.container(0, 0);

    this.container.add([
      this.bg,
      this.attemptLabel,
      this.attemptValue,
      this.scoreLabel,
      this.scoreValue,
      this.timerBg,
      this.timerText,
      this.muteBtn,
      this.muteIcon,
      this.chipsContainer,
    ]);
    this.container.setDepth(50);
  }

  getContainer(): Phaser.GameObjects.Container {
    return this.container;
  }

  layout(zones: LayoutZones): void {
    this.zones = zones;
    const r = zones.header;
    const pad = zones.isMobile ? 12 : 16;
    const rRadius = 12;

    this.bg.clear();
    this.bg.fillStyle(THEME.panelFill, THEME.panelFillAlpha);
    this.bg.fillRoundedRect(r.x, r.y, r.w, r.h, rRadius);
    this.bg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
    this.bg.strokeRoundedRect(r.x, r.y, r.w, r.h, rRadius);

    this.attemptLabel.setPosition(r.x + pad, r.y + 10);
    this.attemptValue.setPosition(r.x + pad, r.y + 26);

    this.scoreLabel.setPosition(r.x + r.w / 2, r.y + 8);
    this.scoreLabel.setOrigin(0.5, 0);
    this.scoreValue.setPosition(r.x + r.w / 2, r.y + 24);
    this.scoreValue.setOrigin(0.5, 0);

    const timerW = 72;
    const timerH = 32;
    const timerX = r.x + r.w - pad - timerW - 40;
    const timerY = r.y + 14;
    this.timerText.setPosition(timerX + timerW / 2, timerY + timerH / 2);
    this.timerText.setOrigin(0.5, 0.5);

    this.muteBtn.setPosition(r.x + r.w - pad - 16, r.y + 30);
    this.muteIcon.setPosition(r.x + r.w - pad - 16, r.y + 30);
    this.muteIcon.setOrigin(0.5, 0.5);

    this.chipsContainer.setPosition(r.x + pad, r.y + 56);
  }

  updateState(scene: Phaser.Scene, state: HudState): void {
    this.attemptValue.setText(`${state.attempt}/${state.maxAttempts}`);
    this.scoreValue.setText(state.score.toLocaleString());

    if (state.score !== this.lastScore && this.lastScore >= 0) {
      scene.tweens.add({
        targets: this.scoreValue,
        scale: 1.08,
        duration: 120,
        yoyo: true,
        ease: "Sine.easeOut",
      });
    }
    this.lastScore = state.score;

    const m = Math.floor(state.secondsLeft / 60);
    const s = state.secondsLeft % 60;
    this.timerText.setText(
      `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    );

    const urgent = state.secondsLeft <= 30 && state.secondsLeft > 0;
    const r = this.zones.header;
    const pad = this.zones.isMobile ? 12 : 16;
    const timerW = 72;
    const timerH = 32;
    const timerX = r.x + r.w - pad - timerW - 40;
    const timerY = r.y + 14;

    this.timerBg.clear();
    if (urgent) {
      this.timerBg.fillStyle(THEME.timerUrgentBg, 0.3);
      this.timerBg.lineStyle(1, THEME.timerUrgentBorder, 0.4);
      this.timerText.setColor("#fca5a5");
    } else {
      this.timerBg.fillStyle(0x000000, 0.25);
      this.timerBg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
      this.timerText.setColor("#ffffff");
    }
    this.timerBg.fillRoundedRect(timerX, timerY, timerW, timerH, 8);
    this.timerBg.strokeRoundedRect(timerX, timerY, timerW, timerH, 8);

    this.muteIcon.setText(state.soundMuted ? "🔇" : "🔊");

    this.chipsContainer.removeAll(true);
    const chips: string[] = [];
    if (state.totalScore !== undefined) {
      chips.push(`${state.totalScore.toLocaleString()} total`);
    }
    if (state.tilesLeft !== undefined) {
      chips.push(`${state.tilesLeft.toLocaleString()} left`);
    }
    const showPool =
      state.rewardPoolCredits !== undefined &&
      state.tournamentType !== "PRACTICE";
    if (showPool) {
      const maxPool =
        state.tournamentType === "DAILY"
          ? fullDailyRewardPool()
          : (state.rewardPoolCredits ?? 0);
      const showMax =
        state.tournamentType === "DAILY" &&
        maxPool > (state.rewardPoolCredits ?? 0);
      chips.push(
        `${state.rewardPoolCredits!.toLocaleString()}${showMax ? ` / ${maxPool.toLocaleString()}` : ""} FRX`
      );
    }
    if (state.playerCount !== undefined) {
      chips.push(`${state.playerCount}/${state.maxPlayers ?? 10}`);
    }

    let cx = 0;
    for (const text of chips) {
      const chipBg = scene.add.graphics();
      chipBg.fillStyle(THEME.chipBg, THEME.chipBgAlpha);
      chipBg.lineStyle(1, THEME.panelFill, THEME.borderWhiteAlpha);
      const chipText = scene.add.text(0, 0, text, {
        fontFamily: FONT.sans,
        fontSize: "11px",
        color: "#cbd5e1",
        fontStyle: "bold",
      });
      const tw = chipText.width + 16;
      const th = 22;
      chipBg.fillRoundedRect(cx, 0, tw, th, 8);
      chipBg.strokeRoundedRect(cx, 0, tw, th, 8);
      chipText.setPosition(cx + 8, 4);
      this.chipsContainer.add([chipBg, chipText]);
      cx += tw + 6;
    }
  }

  destroy(): void {
    this.container.destroy(true);
  }
}
