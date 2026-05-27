"use client";

import { useEffect, useState } from "react";
import { useReconnect } from "wagmi";

/** Restore wagmi connection state after refresh (matches persisted OKX session). */
export function WagmiAutoReconnect() {
  const { reconnectAsync } = useReconnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    void reconnectAsync().catch(() => {});
  }, [mounted, reconnectAsync]);

  return null;
}
