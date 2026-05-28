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
import { tileMatchKey } from "./logic/tile-styles";
import { computeBoardTransform, type BoardTransform } from "./phaser/board-layout";
import {
  boardInnerRect,
  drawBoardFrame,
  drawFooterDivider,
  drawPageBackground,
} from "./phaser/chrome";
import { pulseBoardContainer, tweenFlyToTray, tweenMatchClear } from "./phaser/effects";
import { GameHud, type HudState } from "./phaser/hud";
import {
  computeLayoutZones,
  getBoardStageRect,
  getTraySlotCenter,
  type LayoutZones,
} from "./phaser/layout-zones";
import { ShuffleUI } from "./phaser/shuffle-ui";
import {
  applyBoardTileVisual,
  createBoardTile,
  ensureTileTextures,
} from "./phaser/tile-textures";
import { TrayUI } from "./phaser/tray-ui";
import { EASE, MOBILE_BREAK } from "./phaser/theme";

export type GameEvent = {
  type: "tile_tap" | "match" | "shuffle" | "run_end";
  ts: number;
  data: Record<string, unknown>;
};

export type HudProps = {
  rewardPoolCredits?: number;
  playerCount?: number;
  maxPlayers?: number;
  tournamentType?: string;
  totalScore?: number;
  persistLifetimeScore?: boolean;
  soundMuted?: boolean;
};

export type TileRushGameConfig = {
  initialAttempt?: number;
  maxAttempts?: number;
  roundTimeSeconds?: number;
  hudProps?: HudProps;
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
  onToggleSound?: () => void;
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
  private hudProps: HudProps = {};
  private tileSprites = new Map<string, Phaser.GameObjects.Container>();
  private bgLayer!: Phaser.GameObjects.Graphics;
  private boardFrameLayer!: Phaser.GameObjects.Container;
  private boardTilesLayer!: Phaser.GameObjects.Container;
  private footerDivider!: Phaser.GameObjects.Graphics;
  private hud!: GameHud;
  private trayUI!: TrayUI;
  private shuffleUI!: ShuffleUI;
  private zones!: LayoutZones;
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
    this.hudProps = data.config?.hudProps ?? {};
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
    this.bgLayer = drawPageBackground(this, this.scale.width, this.scale.height);
    this.boardFrameLayer = this.add.container(0, 0);
    this.boardTilesLayer = this.add.container(0, 0);
    this.boardTilesLayer.setDepth(10);
    this.footerDivider = this.add.graphics();

    this.layoutAll();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tickTimer(),
    });

    this.scale.on("resize", () => {
      this.layoutAll();
      this.renderBoard(true);
      this.syncTrayUI();
    });
  }

  setHudProps(props: HudProps): void {
    this.hudProps = { ...this.hudProps, ...props };
    this.refreshHud();
  }

  private isMobile(): boolean {
    return this.scale.width < MOBILE_BREAK;
  }

  private hasStatChips(): boolean {
    return true;
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
    this.layoutAll();
    this.renderBoard(true);
    this.syncTrayUI();
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
    this.shuffleUI.setState(this.shufflesLeft, this.phase !== "playing");
    pulseBoardContainer(this, this.boardTilesLayer);
    this.time.delayedCall(140, () => this.renderBoard(false));
  }

  private layoutAll() {
    const { width, height } = this.scale;
    drawPageBackground(this, width, height, this.bgLayer);

    const hasChips = this.hasStatChips();
    this.zones = computeLayoutZones(width, height, hasChips);

    this.boardFrameLayer.removeAll(true);

    const frame = drawBoardFrame(this, this.zones);
    this.boardFrameLayer.add(frame);
    drawFooterDivider(this, this.zones, this.footerDivider);

    const stage = getBoardStageRect(this.zones);
    const inner = boardInnerRect(stage, this.zones.isMobile);
    this.boardTransform = computeBoardTransform(
      inner.x,
      inner.y,
      inner.w,
      inner.h,
      this.zones.isMobile
    );

    if (this.hud) {
      this.hud.layout(this.zones);
      this.trayUI.layout(this.zones);
      this.shuffleUI.layout(this.zones);
    } else {
      this.hud = new GameHud(this, this.zones, {
        onToggleSound: () => this.callbacks.onToggleSound?.(),
      });
      this.trayUI = new TrayUI(this, this.zones);
      this.shuffleUI = new ShuffleUI(this, this.zones, {
        onShuffle: () => this.shuffleBoard(),
      });
    }

    this.shuffleUI.setState(
      this.shufflesLeft,
      this.phase !== "playing" || this.resolvingTray
    );
    this.refreshHud();
    this.syncTrayUI();
  }

  private refreshHud(): void {
    const state: HudState = {
      score: this.score,
      attempt: this.currentAttempt,
      maxAttempts: this.maxAttempts,
      secondsLeft: this.secondsLeft,
      tilesLeft: this.boardTiles.length,
      totalScore: this.hudProps.persistLifetimeScore
        ? this.hudProps.totalScore
        : undefined,
      rewardPoolCredits: this.hudProps.rewardPoolCredits,
      playerCount: this.hudProps.playerCount,
      maxPlayers: this.hudProps.maxPlayers,
      tournamentType: this.hudProps.tournamentType,
      soundMuted: this.hudProps.soundMuted,
    };
    this.hud.updateState(this, state);
  }

  private syncTrayUI(): void {
    const maxSlots = getTrayMax(this.score);
    this.trayUI.renderTray(this, this.tray, maxSlots);
  }

  private tickTimer() {
    if (this.phase !== "playing" || this.resolvingTray || this.inputLocked) return;
    if (this.secondsLeft <= 0) {
      this.endRun("timeUp");
      return;
    }
    this.secondsLeft -= 1;
    this.callbacks.onTimeTick?.(this.secondsLeft);
    this.refreshHud();
    if (this.secondsLeft > 0 && this.secondsLeft <= 10) {
      this.callbacks.onSound?.("tick");
    }
  }

  private highlightTile(
    container: Phaser.GameObjects.Container,
    hovered: boolean
  ): void {
    const selectable = container.getData("selectable") as boolean;
    applyBoardTileVisual(container, selectable, hovered);
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
          applyBoardTileVisual(container, isSelectable, false);
        }
      }

      if (!container) {
        container = createBoardTile(
          this,
          tile.type,
          tileW,
          tileH,
          tile.layer,
          isSelectable,
          this.isMobile()
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

        this.boardTilesLayer.add(container);
        this.tileSprites.set(tile.id, container);

        if (!instant) {
          container.setAlpha(0);
          this.tweens.add({
            targets: container,
            alpha: isSelectable ? 1 : this.isMobile() ? 0.42 : 0.5,
            duration: 180,
            ease: "Sine.easeOut",
          });
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
    const slotIndex = trayWithNew.findIndex((t) => t.id === tile.id);
    const resolved = resolveTriples(trayWithNew);
    const finalTray = resolved.tray;
    const newScore = this.score + resolved.matches;
    const maxSlots = getTrayMax(this.score);

    const finishLogic = () => {
      this.boardTiles = this.boardTiles.filter((t) => t.id !== tileId);
      this.callbacks.onTilesLeftChange?.(this.boardTiles.length);
      this.renderBoard(true);
      this.refreshHud();

      const completeTurn = () => {
        this.score = newScore;
        this.callbacks.onScoreChange?.(this.score);
        this.tray = finalTray;
        this.syncTrayUI();
        this.refreshHud();
        this.inputLocked = false;
        this.shuffleUI.setState(this.shufflesLeft, false);

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

        const matchKey = findTripleMatchKey(trayWithNew);
        const matchedSprites: Phaser.GameObjects.Container[] = [];
        if (matchKey !== null) {
          for (const t of trayWithNew) {
            if (tileMatchKey(t.type) === matchKey) {
              const spr = this.trayUI.getTileSprite(t.id);
              if (spr) matchedSprites.push(spr);
            }
          }
        }

        this.resolvingTray = true;
        this.tray = trayWithNew;
        this.syncTrayUI();
        this.shuffleUI.setState(this.shufflesLeft, true);

        this.matchClearTimer?.remove();
        this.matchClearTimer = this.time.delayedCall(MATCH_CLEAR_MS, () => {
          tweenMatchClear(this, matchedSprites.slice(0, 3), () => {
            this.matchClearTimer = undefined;
            this.resolvingTray = false;
            completeTurn();
          });
        });
        return;
      }

      this.tray = finalTray;
      this.syncTrayUI();
      completeTurn();
    };

    if (sprite) {
      sprite.removeAllListeners();
      sprite.disableInteractive();
      sprite.setDepth(9000);

      const target = getTraySlotCenter(this.zones, slotIndex, maxSlots);
      tweenFlyToTray(this, sprite, target.x, target.y, () => {
        sprite.destroy();
        this.tileSprites.delete(tileId);
        finishLogic();
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
    this.shuffleUI.setState(this.shufflesLeft, true);
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
    this.hud?.destroy();
    this.trayUI?.destroy();
    this.shuffleUI?.destroy();
    this.scale.off("resize");
  }
}

export type TileRushGameHandle = {
  game: Phaser.Game;
  scene: TileRushScene;
  reloadSession: (attempt: number) => void;
  shuffleBoard: () => void;
  setHudProps: (props: HudProps) => void;
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
    backgroundColor: "#0b0f1a",
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
    setHudProps: (props: HudProps) => scene.setHudProps(props),
    destroy: () => {
      game.destroy(true);
    },
  };
}
