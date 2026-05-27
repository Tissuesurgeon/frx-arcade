"use client";

import { motion } from "framer-motion";
import { GameScreenshotMock } from "@/components/landing/GameScreenshotMock";

export function GameMockCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500/30 via-violet-500/20 to-cyan-500/30 blur-lg" />
      <motion.div
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="relative"
      >
        <GameScreenshotMock
          className="shadow-xl shadow-indigo-500/15"
          role="img"
          aria-label="Tile Rush game interface: shared board, scoring, and tray"
          score="24"
        />
      </motion.div>
    </div>
  );
}
