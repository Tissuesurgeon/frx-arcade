import * as Phaser from "phaser";
import {
  addTileToTrayGrouped,
  createInitialBoard,
  getSelectableTileIds,
  isTrayStuck,
  resolveTriples,
  shuffleBoardTileTypes,
} from "./logic/board";
import {
  getTrayMax,
  MATCH_CLEAR_MS,
  MAX_ATTEMPTS,
  ROUND_TIME_SECONDS,
  SHUFFLES_PER_RUN,
} from "./logic/constants";
import { getTileDiameterNorm } from "./logic/layout";
import { phaserTileColors } from "./logic/phaser-colors";
import type { GamePhase, Tile, TrayTile } from "./logic/types";
import { tileLabel } from "./logic/tile-styles";

export type GameEvent = {
  type: "tile_tap" | "match" | "shuffle" | "run_end";
  ts: number;
  data: Record<string, unknown>;
};

export type TileRushGameConfig = {
  initialAttempt?: number;
  maxAttempts?: number;
  roundTimeSeconds?: number;
};

export type TileRushCallbacks = {
  onScoreChange?: (score: number) => void;
  onPhaseChange?: (phase: GamePhase) => void;
  onAttemptChange?: (attempt: number) => void;
  onTimeTick?: (secondsLeft: number) => void;
  onTilesLeftChange?: (count: number) => void;
  onShufflesLeftChange?: (count: number) => void;
  onEvent?: (event: GameEvent) => void;
  onSound?: (id: "pick" | "match" | "shuffle" | "tick" | "cleared" | "gameOver" | "timeUp") => void;
};

type SceneData = {
  callbacks: TileRushCallbacks;
  config: TileRushGameConfig;
};

const TRAY_ZONE_H = 72;
const ACTION_ZONE_H = 52;

export class TileRushScene extends Phaser.Scene {
  private boardTiles: Tile[] = [];
  private tray: TrayTile[] = [];
  private score = 0;
  private phase: GamePhase = "playing";
  private secondsLeft = ROUND_TIME_SECONDS;
  private currentAttempt = 1;
  private maxAttempts = MAX_ATTEMPTS;
  private roundTimeSeconds = ROUND_TIME_SECONDS;
  private shufflesLeft = SHUFFLES_PER_RUN;
  private callbacks: TileRushCallbacks = {};
  private tileSprites = new Map<string, Phaser.GameObjects.Container>();
  private trayZone!: Phaser.GameObjects.Container;
  private shuffleBtn!: Phaser.GameObjects.Container;
  private timerEvent?: Phaser.Time.TimerEvent;
  private resolvingTray = false;
  private matchClearTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "TileRushScene" });
  }

  init(data: SceneData) {
    this.callbacks = data.callbacks ?? {};
    const cfg = data.config ?? {};
    this.maxAttempts = cfg.maxAttempts ?? MAX_ATTEMPTS;
    this.roundTimeSeconds = cfg.roundTimeSeconds ?? ROUND_TIME_SECONDS;
    const attempt = Math.min(
      Math.max(cfg.initialAttempt ?? 1, 1),
      this.maxAttempts
    );
    this.resetRun(attempt);
  }

  create() {
    this.cameras.main.setBackgroundColor("#0a0a12");
    this.trayZone = this.add.container(0, 0);
    this.buildShuffleButton();
    this.renderBoard();
    this.renderTray();
    this.layoutUi();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });

    this.scale.on("resize", () => this.layoutUi());
  }

  private resetRun(attempt: number) {
    this.currentAttempt = attempt;
    this.boardTiles = createInitialBoard(attempt);
    this.tray = [];
    this.score = 0;
    this.phase = "playing";
    this.secondsLeft = this.roundTimeSeconds;
    this.shufflesLeft = SHUFFLES_PER_RUN;
    this.resolvingTray = false;
    this.callbacks.onAttemptChange?.(this.currentAttempt);
    this.callbacks.onScoreChange?.(this.score);
    this.callbacks.onPhaseChange?.(this.phase);
    this.callbacks.onTimeTick?.(this.secondsLeft);
    this.callbacks.onTilesLeftChange?.(this.boardTiles.length);
    this.callbacks.onShufflesLeftChange?.(this.shufflesLeft);
  }

  reloadSession(attempt: number) {
    this.matchClearTimer?.remove();
    this.matchClearTimer = undefined;
    this.resolvingTray = false;
    this.resetRun(attempt);
    this.renderBoard();
    this.renderTray();
    this.updateShuffleButton();
  }

  private getBoardRect() {
    const pad = 12;
    const top = pad;
    const bottom = this.scale.height - TRAY_ZONE_H - ACTION_ZONE_H - pad;
    const w = this.scale.width - pad * 2;
    const h = Math.max(120, bottom - top);
    return { x: pad, y: top, w, h };
  }

  private layoutUi() {
    this.renderBoard();
    this.renderTray();
    this.positionShuffleButton();
  }

  private tickTimer() {
    if (this.phase !== "playing" || this.resolvingTray) return;
    if (this.secondsLeft <= 0) {
      this.endRun("timeUp");
      return;
    }
    this.secondsLeft -= 1;
    this.callbacks.onTimeTick?.(this.secondsLeft);
    if (this.secondsLeft > 0 && this.secondsLeft <= 10) {
      this.callbacks.onSound?.("tick");
    }
  }

  private buildShuffleButton() {
    const bg = this.add.rectangle(0, 0, 120, 40, 0x1e293b, 0.95);
    bg.setStrokeStyle(2, 0x475569, 0.9);
    const label = this.add.text(0, 0, "Shuffle", {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      color: "#e2e8f0",
    }).setOrigin(0.5);

    this.shuffleBtn = this.add.container(0, 0, [bg, label]);
    this.shuffleBtn.setSize(120, 40);
    this.shuffleBtn.setInteractive(
      new Phaser.Geom.Rectangle(-60, -20, 120, 40),
      Phaser.Geom.Rectangle.Contains
    );
    this.shuffleBtn.on("pointerdown", () => this.shuffleBoard());
    this.positionShuffleButton();
  }

  private positionShuffleButton() {
    const y = this.scale.height - ACTION_ZONE_H / 2 - 8;
    const x = this.scale.width - 72;
    this.shuffleBtn.setPosition(x, y);
    this.updateShuffleButton();
  }

  private updateShuffleButton() {
    const enabled =
      this.phase === "playing" &&
      !this.resolvingTray &&
      this.shufflesLeft > 0 &&
      this.boardTiles.length > 0;
    this.shuffleBtn.setAlpha(enabled ? 1 : 0.45);
    const label = this.shuffleBtn.list[1] as Phaser.GameObjects.Text;
    label.setText(`Shuffle (${this.shufflesLeft})`);
  }

  private renderBoard() {
    this.tileSprites.forEach((c) => c.destroy());
    this.tileSprites.clear();

    const rect = this.getBoardRect();
    const span = Math.min(rect.w, rect.h);
    const tileSize = Math.max(22, getTileDiameterNorm() * span * 0.92);

    const sorted = [...this.boardTiles].sort((a, b) => a.zIndex - b.zIndex);
    const selectable = getSelectableTileIds(this.boardTiles);

    for (const tile of sorted) {
      const x = rect.x + tile.xNorm * rect.w;
      const y = rect.y + tile.yNorm * rect.h;
      const colors = phaserTileColors(tile.type);
      const isSelectable = selectable.has(tile.id);

      const container = this.add.container(x, y);
      container.setDepth(tile.zIndex);

      const shadow = this.add.rectangle(2, 3, tileSize, tileSize, 0x000000, 0.35);
      const bg = this.add.rectangle(0, 0, tileSize, tileSize, colors.fill, 1);
      bg.setStrokeStyle(2, colors.stroke, isSelectable ? 0.95 : 0.35);

      const fontSize = Math.max(11, Math.floor(tileSize * 0.38));
      const label = this.add.text(0, 0, tileLabel(tile.type), {
        fontFamily: "system-ui, sans-serif",
        fontSize: `${fontSize}px`,
        color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
        fontStyle: "bold",
      }).setOrigin(0.5);

      container.add([shadow, bg, label]);
      container.setSize(tileSize, tileSize);
      container.setInteractive(
        new Phaser.Geom.Rectangle(-tileSize / 2, -tileSize / 2, tileSize, tileSize),
        Phaser.Geom.Rectangle.Contains
      );
      container.setData("tileId", tile.id);
      container.on("pointerdown", () => this.onTileTap(tile.id));
      container.setAlpha(isSelectable ? 1 : 0.5);

      if (isSelectable) {
        container.on("pointerover", () => bg.setStrokeStyle(2, 0x67e8f9, 1));
        container.on("pointerout", () => bg.setStrokeStyle(2, colors.stroke, 0.95));
      }

      this.tileSprites.set(tile.id, container);
    }
  }

  private renderTray() {
    this.trayZone.removeAll(true);

    const cap = getTrayMax(this.score);
    const slotSize = 36;
    const gap = 6;
    const totalW = cap * slotSize + (cap - 1) * gap;
    const y = this.scale.height - TRAY_ZONE_H / 2 - ACTION_ZONE_H + 4;
    const startX = this.scale.width / 2 - totalW / 2 + slotSize / 2;

    for (let i = 0; i < cap; i++) {
      const x = startX + i * (slotSize + gap);
      const slot = this.add.rectangle(x, y, slotSize, slotSize, 0x0f172a, 0.92);
      slot.setStrokeStyle(1, 0x334155, 0.9);
      this.trayZone.add(slot);

      const tt = this.tray[i];
      if (tt) {
        const colors = phaserTileColors(tt.type);
        const tileBg = this.add.rectangle(x, y, slotSize - 2, slotSize - 2, colors.fill, 1);
        tileBg.setStrokeStyle(1, colors.stroke, 0.8);
        const lbl = this.add.text(x, y, tileLabel(tt.type), {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: `#${(colors.text & 0xffffff).toString(16).padStart(6, "0")}`,
          fontStyle: "bold",
        }).setOrigin(0.5);
        this.trayZone.add([tileBg, lbl]);
      }
    }
  }

  private onTileTap(tileId: string) {
    if (this.phase !== "playing" || this.resolvingTray) return;
    const tile = this.boardTiles.find((t) => t.id === tileId);
    if (!tile || !getSelectableTileIds(this.boardTiles).has(tileId)) return;

    const cap = getTrayMax(this.score);
    if (isTrayStuck(this.tray, cap)) {
      this.endRun("gameOver");
      return;
    }

    this.callbacks.onSound?.("pick");
    this.emitEvent("tile_tap", { tileId, type: tile.type });

    this.boardTiles = this.boardTiles.filter((t) => t.id !== tileId);
    this.callbacks.onTilesLeftChange?.(this.boardTiles.length);

    const trayWithNew = addTileToTrayGrouped(this.tray, {
      id: tile.id,
      type: tile.type,
    });
    const resolved = resolveTriples(trayWithNew);
    const finalTray = resolved.tray;
    const newScore = this.score + resolved.matches;

    this.renderBoard();

    const finishTurn = () => {
      this.score = newScore;
      this.callbacks.onScoreChange?.(this.score);
      this.tray = finalTray;
      this.renderTray();
      this.updateShuffleButton();

      const capAfter = getTrayMax(this.score);
      if (this.boardTiles.length === 0) {
        this.endRun("cleared");
        return;
      }
      if (isTrayStuck(this.tray, capAfter)) {
        this.endRun("gameOver");
      }
    };

    if (resolved.matches > 0) {
      this.callbacks.onSound?.("match");
      this.emitEvent("match", { count: resolved.matches });
      this.cameras.main.flash(80, 34, 211, 238, false);
      this.resolvingTray = true;
      this.tray = trayWithNew;
      this.renderTray();
      this.matchClearTimer?.remove();
      this.matchClearTimer = this.time.delayedCall(MATCH_CLEAR_MS, () => {
        this.matchClearTimer = undefined;
        this.resolvingTray = false;
        finishTurn();
      });
      return;
    }

    this.tray = finalTray;
    this.renderTray();
    finishTurn();
  }

  shuffleBoard() {
    if (
      this.phase !== "playing" ||
      this.resolvingTray ||
      this.shufflesLeft <= 0 ||
      this.boardTiles.length === 0
    ) {
      return;
    }
    this.boardTiles = shuffleBoardTileTypes(this.boardTiles);
    this.shufflesLeft -= 1;
    this.callbacks.onSound?.("shuffle");
    this.callbacks.onShufflesLeftChange?.(this.shufflesLeft);
    this.emitEvent("shuffle", { remaining: this.shufflesLeft });
    this.renderBoard();
    this.updateShuffleButton();
  }

  getState() {
    return {
      score: this.score,
      phase: this.phase,
      attempt: this.currentAttempt,
      secondsLeft: this.secondsLeft,
      shufflesLeft: this.shufflesLeft,
      tilesLeft: this.boardTiles.length,
      maxAttempts: this.maxAttempts,
    };
  }

  private endRun(phase: GamePhase) {
    if (this.phase !== "playing") return;
    this.phase = phase;
    this.callbacks.onPhaseChange?.(phase);
    if (phase === "cleared") this.callbacks.onSound?.("cleared");
    else if (phase === "gameOver") this.callbacks.onSound?.("gameOver");
    else if (phase === "timeUp") this.callbacks.onSound?.("timeUp");
    this.emitEvent("run_end", { phase, score: this.score, attempt: this.currentAttempt });
    this.updateShuffleButton();
  }

  private emitEvent(type: GameEvent["type"], data: Record<string, unknown>) {
    this.callbacks.onEvent?.({ type, ts: Date.now(), data });
  }

  shutdown() {
    this.timerEvent?.remove();
    this.matchClearTimer?.remove();
    this.scale.off("resize");
  }
}

export type TileRushGameHandle = {
  game: Phaser.Game;
  scene: TileRushScene;
  reloadSession: (attempt: number) => void;
  destroy: () => void;
};

export function createTileRushGame(
  parent: HTMLElement,
  callbacks: TileRushCallbacks = {},
  config: TileRushGameConfig = {}
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
    audio: { noAudio: true },
  });

  game.scene.start("TileRushScene", { callbacks, config });

  const scene = game.scene.getScene("TileRushScene") as TileRushScene;

  return {
    game,
    scene,
    reloadSession: (attempt: number) => scene.reloadSession(attempt),
    destroy: () => {
      game.destroy(true);
    },
  };
}
