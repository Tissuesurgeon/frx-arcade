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
import type { GamePhase, Tile, TrayTile } from "./logic/types";
import { phaserTileColors } from "./logic/phaser-colors";
import {
  computeBoardTransform,
  getBoardFrameRect,
  type BoardTransform,
} from "./phaser/board-layout";
import {
  createShuffleButton,
  drawBackground,
  drawBoardFrame,
  drawTrayDock,
  drawTraySlot,
  updateShuffleButton,
} from "./phaser/chrome";
import {
  burstMatchParticles,
  ensureParticleTexture,
  floatScoreText,
  popInTrayTile,
  pulseCamera,
  tweenPickTile,
} from "./phaser/effects";
import {
  addTileSprite,
  ensureTileTextures,
  setTileHighlight,
} from "./phaser/tile-textures";
import { MOBILE_BREAK } from "./phaser/theme";

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
  onSound?: (
    id: "pick" | "match" | "shuffle" | "tick" | "cleared" | "gameOver" | "timeUp"
  ) => void;
};

type SceneData = {
  callbacks: TileRushCallbacks;
  config: TileRushGameConfig;
};

const TRAY_ZONE_H = 88;
const ACTION_ZONE_H = 58;

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
  private trayLayer!: Phaser.GameObjects.Container;
  private chromeLayer!: Phaser.GameObjects.Container;
  private boardLayer!: Phaser.GameObjects.Container;
  private shuffleBtn!: Phaser.GameObjects.Container;
  private boardTransform!: BoardTransform;
  private timerEvent?: Phaser.Time.TimerEvent;
  private resolvingTray = false;
  private matchClearTimer?: Phaser.Time.TimerEvent;
  private inputLocked = false;

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
    ensureParticleTexture(this);

    this.chromeLayer = this.add.container(0, 0);
    this.boardLayer = this.add.container(0, 0);
    this.trayLayer = this.add.container(0, 0);

    this.buildShuffleButton();
    this.layoutChrome();
    this.renderBoard(true);
    this.renderTray();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });

    this.scale.on("resize", () => {
      this.layoutChrome();
      this.renderBoard(true);
      this.renderTray();
      this.positionShuffleButton();
    });
  }

  private isMobile(): boolean {
    return this.scale.width < MOBILE_BREAK;
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
    this.inputLocked = false;
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
    this.inputLocked = false;
    this.resetRun(attempt);
    this.renderBoard(true);
    this.renderTray();
    this.updateShuffleBtn();
  }

  private layoutChrome() {
    const { width, height } = this.scale;
    this.chromeLayer.removeAll(true);

    const bg = drawBackground(this, width, height);
    const frame = getBoardFrameRect(width, height, TRAY_ZONE_H, ACTION_ZONE_H);
    const boardFrame = drawBoardFrame(this, frame.x, frame.y, frame.w, frame.h);

    this.boardTransform = computeBoardTransform(
      frame.x,
      frame.y,
      frame.w,
      frame.h,
      this.isMobile()
    );

    const dockW = Math.min(width - 24, 520);
    const dockX = (width - dockW) / 2;
    const dockY = height - TRAY_ZONE_H - ACTION_ZONE_H + 6;
    const trayDock = drawTrayDock(this, dockX, dockY, dockW, TRAY_ZONE_H - 8);

    this.chromeLayer.add([bg, boardFrame, trayDock]);
  }

  private buildShuffleButton() {
    this.shuffleBtn = createShuffleButton(this, 0, 0, () => this.shuffleBoard());
    this.positionShuffleButton();
  }

  private positionShuffleButton() {
    const x = this.scale.width - 78;
    const y = this.scale.height - ACTION_ZONE_H / 2 - 6;
    this.shuffleBtn.setPosition(x, y);
    this.updateShuffleBtn();
  }

  private updateShuffleBtn() {
    const enabled =
      this.phase === "playing" &&
      !this.resolvingTray &&
      !this.inputLocked &&
      this.shufflesLeft > 0 &&
      this.boardTiles.length > 0;
    updateShuffleButton(this.shuffleBtn, this.shufflesLeft, enabled);
  }

  private tickTimer() {
    if (this.phase !== "playing" || this.resolvingTray || this.inputLocked) return;
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

  private renderBoard(instant = false) {
    if (!this.boardTransform) return;

    const { tileW, tileH, mapPosition } = this.boardTransform;
    ensureTileTextures(this, tileW, tileH);

    const sorted = [...this.boardTiles].sort((a, b) => a.zIndex - b.zIndex);
    const selectable = getSelectableTileIds(this.boardTiles);
    const existing = new Set(this.tileSprites.keys());
    const next = new Set(sorted.map((t) => t.id));

    for (const id of existing) {
      if (!next.has(id)) {
        this.tileSprites.get(id)?.destroy();
        this.tileSprites.delete(id);
      }
    }

    for (const tile of sorted) {
      const pos = mapPosition(tile.xNorm, tile.yNorm, tile.layer);
      const isSelectable = selectable.has(tile.id);
      let container = this.tileSprites.get(tile.id);

      if (container) {
        const wasSelectable = container.getData("selectable") as boolean;
        if (wasSelectable !== isSelectable) {
          container.destroy();
          this.tileSprites.delete(tile.id);
          container = undefined;
        } else {
          container.setPosition(pos.x, pos.y);
          container.setDepth(100 + tile.zIndex);
          container.setAlpha(isSelectable ? 1 : 0.42);
          container.setScale(isSelectable ? 1 : 0.96);
        }
      }

      if (!container) {
        container = addTileSprite(this, tile.type, tileW, tileH, isSelectable);
        container.setPosition(pos.x, pos.y);
        container.setDepth(100 + tile.zIndex);
        container.setData("tileId", tile.id);
        container.setInteractive(
          new Phaser.Geom.Rectangle(-tileW / 2, -tileH / 2, tileW, tileH),
          Phaser.Geom.Rectangle.Contains
        );
        container.on("pointerdown", () => this.onTileTap(tile.id));
        if (isSelectable) {
          container.on("pointerover", () => setTileHighlight(container!, true));
          container.on("pointerout", () => setTileHighlight(container!, false));
        }
        this.boardLayer.add(container);
        this.tileSprites.set(tile.id, container);

        if (!instant) {
          container.setScale(0.5);
          container.setAlpha(0);
          this.tweens.add({
            targets: container,
            scale: isSelectable ? 1 : 0.96,
            alpha: isSelectable ? 1 : 0.42,
            duration: 280,
            ease: "Back.easeOut",
          });
        }
      }
    }
  }

  private getTrayLayout() {
    const cap = getTrayMax(this.score);
    const slotSize = Math.min(44, this.scale.width * 0.1);
    const gap = 7;
    const totalW = cap * slotSize + (cap - 1) * gap;
    const y = this.scale.height - TRAY_ZONE_H / 2 - ACTION_ZONE_H + 10;
    const startX = this.scale.width / 2 - totalW / 2 + slotSize / 2;
    return { cap, slotSize, gap, totalW, y, startX };
  }

  private renderTray(animateNew = false) {
    this.trayLayer.removeAll(true);
    const { cap, slotSize, y, startX, gap } = this.getTrayLayout();

    for (let i = 0; i < cap; i++) {
      const x = startX + i * (slotSize + gap);
      const slot = drawTraySlot(this, x, y, slotSize);
      this.trayLayer.add(slot);

      const tt = this.tray[i];
      if (tt) {
        const tile = addTileSprite(this, tt.type, slotSize - 4, (slotSize - 4) / 0.82, true);
        tile.setPosition(x, y);
        tile.setDepth(5100 + i);
        this.trayLayer.add(tile);
        if (animateNew && i === this.tray.length - 1) {
          popInTrayTile(tile, 0);
        }
      }
    }
  }

  private onTileTap(tileId: string) {
    if (this.phase !== "playing" || this.resolvingTray || this.inputLocked) return;
    const tile = this.boardTiles.find((t) => t.id === tileId);
    if (!tile || !getSelectableTileIds(this.boardTiles).has(tileId)) return;

    const cap = getTrayMax(this.score);
    if (isTrayStuck(this.tray, cap)) {
      this.endRun("gameOver");
      return;
    }

    this.inputLocked = true;
    this.callbacks.onSound?.("pick");
    this.emitEvent("tile_tap", { tileId, type: tile.type });

    const sprite = this.tileSprites.get(tileId);
    const trayWithNew = addTileToTrayGrouped(this.tray, {
      id: tile.id,
      type: tile.type,
    });
    const resolved = resolveTriples(trayWithNew);
    const finalTray = resolved.tray;
    const newScore = this.score + resolved.matches;

    const finishLogic = () => {
      this.boardTiles = this.boardTiles.filter((t) => t.id !== tileId);
      this.callbacks.onTilesLeftChange?.(this.boardTiles.length);
      this.renderBoard(true);

      const completeTurn = () => {
        this.score = newScore;
        this.callbacks.onScoreChange?.(this.score);
        this.tray = finalTray;
        this.renderTray();
        this.updateShuffleBtn();
        this.inputLocked = false;

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
        pulseCamera(this);
        const bounds = sprite?.getBounds();
        const cx = bounds?.centerX ?? this.scale.width / 2;
        const cy = bounds?.centerY ?? this.scale.height / 2;
        const faceColor = phaserTileColors(tile.type).fill;
        burstMatchParticles(this, cx, cy, faceColor);
        floatScoreText(this, cx, cy - 20, resolved.matches);

        this.resolvingTray = true;
        this.tray = trayWithNew;
        this.renderTray(true);
        this.matchClearTimer?.remove();
        this.matchClearTimer = this.time.delayedCall(MATCH_CLEAR_MS, () => {
          this.matchClearTimer = undefined;
          this.resolvingTray = false;
          completeTurn();
        });
        return;
      }

      this.tray = finalTray;
      this.renderTray(true);
      completeTurn();
    };

    if (sprite) {
      sprite.removeAllListeners();
      sprite.disableInteractive();
      tweenPickTile(sprite, () => {
        sprite.destroy();
        this.tileSprites.delete(tileId);
        finishLogic();
      });
    } else {
      finishLogic();
    }
  }

  shuffleBoard() {
    if (
      this.phase !== "playing" ||
      this.resolvingTray ||
      this.inputLocked ||
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

    for (const [, spr] of this.tileSprites) {
      this.tweens.add({
        targets: spr,
        angle: Phaser.Math.Between(-8, 8),
        duration: 120,
        yoyo: true,
        ease: "Sine.easeInOut",
      });
    }

    this.time.delayedCall(140, () => {
      this.renderBoard(false);
      this.updateShuffleBtn();
    });
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
    this.inputLocked = true;
    this.callbacks.onPhaseChange?.(phase);
    if (phase === "cleared") this.callbacks.onSound?.("cleared");
    else if (phase === "gameOver") this.callbacks.onSound?.("gameOver");
    else if (phase === "timeUp") this.callbacks.onSound?.("timeUp");
    this.emitEvent("run_end", { phase, score: this.score, attempt: this.currentAttempt });
    this.updateShuffleBtn();
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
    backgroundColor: "#07050f",
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: TileRushScene,
    fps: { target: 60 },
    audio: { noAudio: true },
    render: {
      antialias: true,
      pixelArt: false,
      roundPixels: true,
    },
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
