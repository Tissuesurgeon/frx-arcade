import { TRAY_MAX_EASY } from "../logic/constants";
import { MOBILE_BREAK } from "./theme";

export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutZones = {
  width: number;
  height: number;
  isMobile: boolean;
  header: Rect;
  board: Rect;
  footer: Rect;
  trayPanel: Rect;
  shuffleButton: Rect;
  displaySlots: number;
  paddingX: number;
};

export function computeLayoutZones(
  width: number,
  height: number,
  hasStatChips: boolean
): LayoutZones {
  const isMobile = width < MOBILE_BREAK;
  const paddingX = isMobile ? 8 : 16;

  const headerH = isMobile
    ? hasStatChips
      ? 96
      : 72
    : hasStatChips
      ? 112
      : 76;

  const footerH = isMobile ? 118 : 128;
  const headerY = isMobile ? 8 : 12;
  const footerY = height - footerH - (isMobile ? 0 : 4);

  const header: Rect = {
    x: paddingX,
    y: headerY,
    w: width - paddingX * 2,
    h: headerH,
  };

  const board: Rect = {
    x: paddingX,
    y: header.y + header.h + (isMobile ? 4 : 8),
    w: width - paddingX * 2,
    h: Math.max(120, footerY - header.y - header.h - (isMobile ? 8 : 16)),
  };

  const footer: Rect = {
    x: paddingX,
    y: footerY,
    w: width - paddingX * 2,
    h: footerH,
  };

  const shuffleSize = isMobile ? 48 : 64;
  const shuffleGap = isMobile ? 8 : 12;
  const shuffleButton: Rect = {
    x: footer.x + footer.w - shuffleSize,
    y: footer.y + footer.h - shuffleSize - 8,
    w: shuffleSize,
    h: shuffleSize,
  };

  const trayPanel: Rect = {
    x: footer.x,
    y: footer.y + 4,
    w: footer.w - shuffleSize - shuffleGap,
    h: footer.h - 8,
  };

  return {
    width,
    height,
    isMobile,
    header,
    board,
    footer,
    trayPanel,
    shuffleButton,
    displaySlots: TRAY_MAX_EASY,
    paddingX,
  };
}

/** Square board stage inset inside the board zone (desktop). */
export function getBoardStageRect(zones: LayoutZones): Rect {
  if (zones.isMobile) {
    return {
      x: zones.board.x + 6,
      y: zones.board.y + 2,
      w: zones.board.w - 12,
      h: zones.board.h - 4,
    };
  }

  const pad = 8;
  const side = Math.min(
    zones.board.w - pad * 2,
    zones.board.h - pad * 2
  );
  return {
    x: zones.board.x + (zones.board.w - side) / 2,
    y: zones.board.y + (zones.board.h - side) / 2,
    w: side,
    h: side,
  };
}

export function getTraySlotCenter(
  zones: LayoutZones,
  slotIndex: number,
  maxSlots: number
): { x: number; y: number; slotW: number; slotH: number } {
  const panel = zones.trayPanel;
  const labelH = 18;
  const dangerH = 18;
  const innerY = panel.y + labelH + 4;
  const innerH = panel.h - labelH - dangerH - 12;
  const innerX = panel.x + (zones.isMobile ? 8 : 12);
  const innerW = panel.w - (zones.isMobile ? 16 : 24);

  const gap = zones.isMobile ? 4 : 6;
  const slotW =
    (innerW - gap * (zones.displaySlots - 1)) / zones.displaySlots;
  const slotH = Math.min(innerH, slotW * 1.25);

  const usedSlots = Math.min(maxSlots, zones.displaySlots);
  const gridW = usedSlots * slotW + (usedSlots - 1) * gap;
  const startX = innerX + (innerW - gridW) / 2;
  const centerY = innerY + slotH / 2;

  if (slotIndex >= usedSlots) {
    return { x: startX, y: centerY, slotW, slotH };
  }

  return {
    x: startX + slotIndex * (slotW + gap) + slotW / 2,
    y: centerY,
    slotW,
    slotH,
  };
}
