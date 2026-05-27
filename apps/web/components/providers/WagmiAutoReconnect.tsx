"use client";

import { useEffect } from "react";
import { useReconnect } from "wagmi";

/** Restore wagmi connection state after refresh (matches persisted OKX session). */
export function WagmiAutoReconnect() {
  const { reconnectAsync } = useReconnect();

  useEffect(() => {
    void reconnectAsync().catch(() => {});
  }, [reconnectAsync]);

  return null;
}
