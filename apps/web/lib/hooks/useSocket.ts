"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
  Tournament,
  LeaderboardEntry,
  JackpotTick,
} from "@frx/shared";
import { SOCKET_NAMESPACES } from "@frx/shared";
import { WS_URL } from "@/lib/utils";

export function useTournamentFeed(onFeed: (t: Tournament[]) => void) {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);

  useEffect(() => {
    const socket = io(`${WS_URL}${SOCKET_NAMESPACES.tournaments}`, {
      transports: ["websocket"],
    });
    socketRef.current = socket;
    socket.on("tournament:feed", onFeed);
    return () => {
      socket.off("tournament:feed", onFeed);
      socket.disconnect();
    };
  }, [onFeed]);
}

export function useLeaderboardLive(
  tournamentId: string | null,
  onUpdate: (entries: LeaderboardEntry[]) => void
) {
  useEffect(() => {
    if (!tournamentId) return;
    const socket = io(`${WS_URL}${SOCKET_NAMESPACES.leaderboards}`, {
      transports: ["websocket"],
    });
    socket.emit("leaderboard:subscribe", tournamentId);
    socket.on("leaderboard:snapshot", onUpdate);
    socket.on("leaderboard:patch", (patch) => onUpdate(patch.entries));
    return () => {
      socket.disconnect();
    };
  }, [tournamentId, onUpdate]);
}

export function useJackpotTick(onTick: (t: JackpotTick) => void) {
  useEffect(() => {
    const socket = io(`${WS_URL}${SOCKET_NAMESPACES.jackpot}`, {
      transports: ["websocket"],
    });
    socket.on("jackpot:tick", onTick);
    return () => {
      socket.disconnect();
    };
  }, [onTick]);
}
