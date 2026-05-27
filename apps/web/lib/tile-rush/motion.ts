/** Shared motion tuning for board ↔ tray transitions. */
export const tileLayoutSpring = {
  type: "spring" as const,
  stiffness: 340,
  damping: 34,
  mass: 0.85,
};

export const tileHoverSpring = {
  type: "spring" as const,
  stiffness: 420,
  damping: 28,
  mass: 0.65,
};

export const tileTapSpring = {
  type: "spring" as const,
  stiffness: 620,
  damping: 38,
  mass: 0.45,
};

export const tileMatchExit = {
  scale: 0.4,
  opacity: 0,
  transition: {
    duration: 0.28,
    ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
  },
};

export const tileLayoutTransition = {
  layout: tileLayoutSpring,
  default: tileLayoutSpring,
};

/** Brief hold so fly-to-tray finishes before triple-clear exit runs. */
export const MATCH_CLEAR_MS = 320;
