import * as Phaser from "phaser";
import {
  createInitialBoard,
  getSelectableTileIds,
  isTrayStuck,
  resolveTriples,
  shuffleBoardTileTypes,
} from "./logic/board";
import {
  getTrayMax,
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "./logic/constants";
import type { GamePhase, Tile, TrayTile } from "./logic/types";
import { tileLabel } from "./logic/tile-styles";

export type TileRushCallbacks = {
  onScoreChange?: (score: number) => void;
  onPhaseChange?: (phase: GamePhase) => void;
  onAttemptChange?: (attempt: number) => void;
  onTimeTick?: (secondsLeft: number) => void;
  onEvent?: (event: GameEvent) => void;
};

export type GameEvent = {
  type: "tile_tap" | "match" | "shuffle" | "run_end";
  ts: number;
  data: Record<string, unknown>;
};

type SceneData = {
  callbacks: TileRushCallbacks;
  tournamentId?: string;
};

export class TileRushScene extends Phaser.Scene {
  private boardTiles: Tile[] = [];
  private tray: TrayTile[] = [];
  private score = 0;
  private phase: GamePhase = "playing";
  private secondsLeft = ROUND_TIME_SECONDS;
  private currentAttempt = 1;
  private shufflesLeft = SHUFFLES_PER_RUN;
  private callbacks: TileRushCallbacks = {};
  private tileSprites = new Map<string, Phaser.GameObjects.Container>();
  private trayTexts: Phaser.GameObjects.Text[] = [];
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private attemptText!: Phaser.GameObjects.Text;
  private timerEvent?: Phaser.Time.TimerEvent;
  private paused = false;

  constructor() {
    super({ key: "TileRushScene" });
  }

  init(data: SceneData) {
    this.callbacks = data.callbacks ?? {};
    this.resetRun(1);
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0a12");

    this.add
      .text(this.scale.width / 2, 24, "TILE RUSH", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: "#67e8f9",
      })
      .setOrigin(0.5);

    this.scoreText = this.add.text(16, 52, "Matches: 0", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#e2e8f0",
    });

    this.timerText = this.add.text(this.scale.width - 16, 52, this.formatTime(this.secondsLeft), {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#fbbf24",
    }).setOrigin(1, 0);

    this.attemptText = this.add.text(this.scale.width / 2, 52, `Attempt 1/${MAX_ATTEMPTS}`, {
      fontFamily: "monospace",
      fontSize: "12px",
      color: "#94a3b8",
    }).setOrigin(0.5, 0);

    this.renderBoard();
    this.renderTray();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });

    this.input.keyboard?.on("keydown-P", () => this.togglePause());
  }

  private resetRun(attempt: number) {
    this.currentAttempt = attempt;
    this.boardTiles = createInitialBoard(attempt);
    this.tray = [];
    this.score = 0;
    this.phase = "playing";
    this.secondsLeft = ROUND_TIME_SECONDS;
    this.shufflesLeft = SHUFFLES_PER_RUN;
    this.callbacks.onAttemptChange?.(this.currentAttempt);
    this.callbacks.onScoreChange?.(this.score);
    this.callbacks.onPhaseChange?.(this.phase);
  }

  private tickTimer() {
    if (this.paused || this.phase !== "playing") return;
    if (this.secondsLeft <= 0) {
      this.endRun("timeUp");
      return;
    }
    this.secondsLeft -= 1;
    this.timerText?.setText(this.formatTime(this.secondsLeft));
    this.callbacks.onTimeTick?.(this.secondsLeft);
  }

  private formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  private renderBoard() {
    this.tileSprites.forEach((c) => c.destroy());
    this.tileSprites.clear();

    const w = this.scale.width;
    const h = this.scale.height * 0.62;
    const padTop = 80;

    for (const tile of this.boardTiles) {
      const x = tile.xNorm * (w - 48) + 24;
      const y = tile.yNorm * (h - 48) + padTop;
      const size = 36;

      const container = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, size, size, 0x1e1b4b, 0.95);
      bg.setStrokeStyle(2, 0x6366f1, 0.8);
      const label = this.add.text(0, 0, tileLabel(tile.type), {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#f8fafc",
      }).setOrigin(0.5);

      container.add([bg, label]);
      container.setSize(size, size);
      container.setInteractive(new Phaser.Geom.Rectangle(-size / 2, -size / 2, size, size), Phaser.Geom.Rectangle.Contains);
      container.setData("tileId", tile.id);
      container.on("pointerdown", () => this.onTileTap(tile.id));

      const selectable = getSelectableTileIds(this.boardTiles).has(tile.id);
      container.setAlpha(selectable ? 1 : 0.45);

      this.tileSprites.set(tile.id, container);
    }
  }

  private renderTray() {
    this.trayTexts.forEach((t) => t.destroy());
    this.trayTexts = [];

    const cap = getTrayMax(this.score);
    const y = this.scale.height - 72;
    const startX = this.scale.width / 2 - (cap * 44) / 2;

    for (let i = 0; i < cap; i++) {
      const slot = this.add.rectangle(startX + i * 44 + 20, y, 36, 36, 0x0f172a, 0.9);
      slot.setStrokeStyle(1, 0x334155);
      const tt = this.tray[i];
      if (tt) {
        const lbl = this.add.text(startX + i * 44 + 20, y, tileLabel(tt.type), {
          fontFamily: "monospace",
          fontSize: "12px",
          color: "#22d3ee",
        }).setOrigin(0.5);
        this.trayTexts.push(lbl);
      }
    }
  }

  private onTileTap(tileId: string) {
    if (this.phase !== "playing" || this.paused) return;
    const tile = this.boardTiles.find((t) => t.id === tileId);
    if (!tile || !getSelectableTileIds(this.boardTiles).has(tileId)) return;

    const cap = getTrayMax(this.score);
    if (isTrayStuck(this.tray, cap)) {
      this.endRun("gameOver");
      return;
    }

    this.emitEvent("tile_tap", { tileId, type: tile.type });

    this.boardTiles = this.boardTiles.filter((t) => t.id !== tileId);
    let nextTray: TrayTile[] = [...this.tray, { id: tile.id, type: tile.type }];
    const resolved = resolveTriples(nextTray);
    nextTray = resolved.tray;

    if (resolved.matches > 0) {
      this.emitEvent("match", { count: resolved.matches });
      this.cameras.main.flash(80, 34, 211, 238, false);
    }

    this.tray = nextTray;
    this.score += resolved.matches;
    this.callbacks.onScoreChange?.(this.score);
    this.scoreText.setText(`Matches: ${this.score}`);

    this.renderBoard();
    this.renderTray();

    if (this.boardTiles.length === 0) {
      this.endRun("cleared");
      return;
    }

    const capAfter = getTrayMax(this.score);
    if (isTrayStuck(this.tray, capAfter)) {
      this.endRun("gameOver");
    }
  }

  shuffleBoard() {
    if (this.phase !== "playing" || this.shufflesLeft <= 0 || this.boardTiles.length === 0) return;
    this.boardTiles = shuffleBoardTileTypes(this.boardTiles);
    this.shufflesLeft -= 1;
    this.emitEvent("shuffle", { remaining: this.shufflesLeft });
    this.renderBoard();
  }

  retry() {
    if (this.currentAttempt >= MAX_ATTEMPTS) return false;
    this.resetRun(this.currentAttempt + 1);
    this.renderBoard();
    this.renderTray();
    this.timerText.setText(this.formatTime(this.secondsLeft));
    this.attemptText.setText(`Attempt ${this.currentAttempt}/${MAX_ATTEMPTS}`);
    return true;
  }

  togglePause() {
    if (this.phase !== "playing") return;
    this.paused = !this.paused;
  }

  getAggregateScore() {
    return this.score;
  }

  getState() {
    return {
      score: this.score,
      phase: this.phase,
      attempt: this.currentAttempt,
      secondsLeft: this.secondsLeft,
      shufflesLeft: this.shufflesLeft,
    };
  }

  private endRun(phase: GamePhase) {
    this.phase = phase;
    this.callbacks.onPhaseChange?.(phase);
    this.emitEvent("run_end", { phase, score: this.score, attempt: this.currentAttempt });
  }

  private emitEvent(type: GameEvent["type"], data: Record<string, unknown>) {
    this.callbacks.onEvent?.({ type, ts: Date.now(), data });
  }

  shutdown() {
    this.timerEvent?.remove();
  }
}

export type TileRushGameHandle = {
  game: Phaser.Game;
  scene: TileRushScene;
  destroy: () => void;
};

export function createTileRushGame(
  parent: HTMLElement,
  callbacks: TileRushCallbacks = {}
): TileRushGameHandle {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: parent.clientWidth || 800,
    height: parent.clientHeight || 600,
    backgroundColor: "#0a0a12",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: TileRushScene,
    fps: { target: 60 },
  });

  game.scene.start("TileRushScene", { callbacks });

  const scene = game.scene.getScene("TileRushScene") as TileRushScene;

  return {
    game,
    scene,
    destroy: () => {
      game.destroy(true);
    },
  };
}
