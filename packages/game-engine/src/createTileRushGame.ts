import * as Phaser from "phaser";
import {
  addTileToTrayGrouped,
  createInitialBoard,
  findTripleMatchKey,
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
import { tileMatchKey } from "./logic/tile-styles";
import {
  computeBoardTransform,
  getBoardArea,
  type BoardTransform,
} from "./phaser/board-layout";
import {
  drawEsportsBackground,
  drawPressureBoard,
  drawTileCountBadge,
} from "./phaser/chrome";
import {
  ensureParticleTexture,
  matchExplosion,
  tweenFlyToTray,
} from "./phaser/effects";
import {
  applyTileVisualState,
  createRichTile,
  ensureTileTextures,
} from "./phaser/tile-textures";
import { EASE, MOBILE_BREAK } from "./phaser/theme";

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

export type TrayTarget = { x: number; y: number };

export type TileRushCallbacks = {
  onScoreChange?: (score: number) => void;
  onPhaseChange?: (phase: GamePhase) => void;
  onAttemptChange?: (attempt: number) => void;
  onTimeTick?: (secondsLeft: number) => void;
  onTilesLeftChange?: (count: number) => void;
  onTrayChange?: (tray: TrayTile[]) => void;
  onShufflesLeftChange?: (count: number) => void;
  onEvent?: (event: GameEvent) => void;
  onSound?: (
    id: "pick" | "match" | "shuffle" | "tick" | "cleared" | "gameOver" | "timeUp"
  ) => void;
  /** Map tray slot index → canvas pixel center (for fly + match VFX). */
  getTrayTarget?: (slotIndex: number) => TrayTarget | null;
};

type SceneData = {
  callbacks: TileRushCallbacks;
  config: TileRushGameConfig;
};

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
  private chromeLayer!: Phaser.GameObjects.Container;
  private boardLayer!: Phaser.GameObjects.Container;
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
    this.layoutChrome();
    this.renderBoard(true);

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });

    this.scale.on("resize", () => {
      this.layoutChrome();
      this.renderBoard(true);
    });
  }

  private isMobile(): boolean {
    return this.scale.width < MOBILE_BREAK;
  }

  private emitTray() {
    this.callbacks.onTrayChange?.([...this.tray]);
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
    this.emitTray();
  }

  reloadSession(attempt: number) {
    this.matchClearTimer?.remove();
    this.matchClearTimer = undefined;
    this.inputLocked = false;
    this.resetRun(attempt);
    this.renderBoard(true);
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
        y: spr.y + 4,
        duration: 90,
        yoyo: true,
        ease: EASE.hover,
      });
    }

    this.cameras.main.flash(60, 0x26, 0xd0, 0xff);
    this.time.delayedCall(140, () => this.renderBoard(false));
  }

  private layoutChrome() {
    const { width, height } = this.scale;
    this.chromeLayer.removeAll(true);

    const bg = drawEsportsBackground(this, width, height);
    const area = getBoardArea(width, height);
    const stage = drawPressureBoard(this, area.x, area.y, area.w, area.h);
    const badge = drawTileCountBadge(
      this,
      area.x + 10,
      area.y + 8,
      this.boardTiles.length
    );

    this.boardTransform = computeBoardTransform(
      area.x + (this.isMobile() ? 3 : 6),
      area.y + (this.isMobile() ? 3 : 6),
      area.w - (this.isMobile() ? 6 : 12),
      area.h - (this.isMobile() ? 6 : 12),
      this.isMobile()
    );

    this.chromeLayer.add([bg, stage, badge]);
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

  private highlightTile(
    container: Phaser.GameObjects.Container,
    hovered: boolean
  ): void {
    const selectable = container.getData("selectable") as boolean;
    applyTileVisualState(container, selectable, hovered);
    this.tweens.add({
      targets: container,
      scale: hovered ? 1.12 : selectable ? 1.05 : 0.93,
      duration: 140,
      ease: EASE.hover,
    });
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
        const wasLayer = container.getData("layer") as number;
        if (wasSelectable !== isSelectable || wasLayer !== tile.layer) {
          container.destroy();
          this.tileSprites.delete(tile.id);
          container = undefined;
        } else {
          container.setPosition(pos.x, pos.y);
          container.setDepth(100 + tile.zIndex);
          applyTileVisualState(container, isSelectable, false);
        }
      }

      if (!container) {
        container = createRichTile(
          this,
          tile.type,
          tileW,
          tileH,
          tile.layer,
          isSelectable
        );
        container.setPosition(pos.x, pos.y);
        container.setDepth(100 + tile.zIndex);
        container.setData("tileId", tile.id);

        if (isSelectable) {
          container.setInteractive(
            new Phaser.Geom.Rectangle(-tileW / 2, -tileH / 2, tileW, tileH),
            Phaser.Geom.Rectangle.Contains
          );
          container.on("pointerdown", () => this.onTileTap(tile.id));
          container.on("pointerover", () => this.highlightTile(container!, true));
          container.on("pointerout", () => this.highlightTile(container!, false));
        }

        this.boardLayer.add(container);
        this.tileSprites.set(tile.id, container);

        if (!instant) {
          container.setScale(0.5);
          container.setAlpha(0);
          this.tweens.add({
            targets: container,
            scale: isSelectable ? 1.05 : 0.93,
            alpha: isSelectable ? 1 : 0.28,
            duration: 260,
            ease: "Back.easeOut",
          });
        }
      }
    }
  }

  private explodeTrayMatch(
    trayBeforeResolve: TrayTile[],
    matchCount: number,
    tileType: number
  ): void {
    const key = findTripleMatchKey(trayBeforeResolve);
    if (key === null) return;

    const color = phaserTileColors(tileType).accent;
    const slots: number[] = [];
    trayBeforeResolve.forEach((t, i) => {
      if (tileMatchKey(t.type) === key) slots.push(i);
    });

    for (const slot of slots.slice(0, 3)) {
      const target = this.callbacks.getTrayTarget?.(slot);
      if (target) {
        matchExplosion(this, target.x, target.y, color, matchCount);
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
    const slotIndex = trayWithNew.findIndex((t) => t.id === tile.id);
    const resolved = resolveTriples(trayWithNew);
    const finalTray = resolved.tray;
    const newScore = this.score + resolved.matches;
    const colors = phaserTileColors(tile.type);

    const finishLogic = () => {
      this.boardTiles = this.boardTiles.filter((t) => t.id !== tileId);
      this.callbacks.onTilesLeftChange?.(this.boardTiles.length);
      this.renderBoard(true);

      const completeTurn = () => {
        this.score = newScore;
        this.callbacks.onScoreChange?.(this.score);
        this.tray = finalTray;
        this.emitTray();
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
        this.explodeTrayMatch(trayWithNew, resolved.matches, tile.type);

        this.resolvingTray = true;
        this.tray = trayWithNew;
        this.emitTray();
        this.matchClearTimer?.remove();
        this.matchClearTimer = this.time.delayedCall(MATCH_CLEAR_MS, () => {
          this.matchClearTimer = undefined;
          this.resolvingTray = false;
          completeTurn();
        });
        return;
      }

      this.tray = finalTray;
      this.emitTray();
      completeTurn();
    };

    if (sprite) {
      sprite.removeAllListeners();
      sprite.disableInteractive();
      sprite.setDepth(9000);

      const target = this.callbacks.getTrayTarget?.(slotIndex);
      if (target) {
        tweenFlyToTray(
          this,
          sprite,
          target.x,
          target.y,
          colors.accent,
          () => {
            sprite.destroy();
            this.tileSprites.delete(tileId);
            finishLogic();
          }
        );
        return;
      }

      this.tweens.add({
        targets: sprite,
        scale: 0,
        alpha: 0,
        y: sprite.y - 40,
        duration: EASE.matchShrink,
        ease: "Back.easeIn",
        onComplete: () => {
          sprite.destroy();
          this.tileSprites.delete(tileId);
          finishLogic();
        },
      });
    } else {
      finishLogic();
    }
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
      tray: [...this.tray],
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
  shuffleBoard: () => void;
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
    backgroundColor: "#0a0e14",
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
    shuffleBoard: () => scene.shuffleBoard(),
    destroy: () => {
      game.destroy(true);
    },
  };
}
