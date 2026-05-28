"use client";

import { useCallback, useEffect, useState } from "react";
import {
  gameSoundEngine,
  readSoundMuted,
  writeSoundMuted,
  type GameSoundId,
} from "@/lib/tile-rush/sound";

export function useGameSound() {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    const stored = readSoundMuted();
    setMuted(stored);
    gameSoundEngine.setMuted(stored);
  }, []);

  const play = useCallback(
    (id: GameSoundId) => {
      gameSoundEngine.play(id);
    },
    []
  );

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      writeSoundMuted(next);
      gameSoundEngine.setMuted(next);
      return next;
    });
  }, []);

  return { muted, play, toggleMute };
}
