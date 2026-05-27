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
    // Defer so OKX connect/sign clicks are not competing with wagmi reconnect (one pending request).
    const timer = window.setTimeout(() => {
      void reconnectAsync().catch(() => {});
    }, 4_000);
    return () => window.clearTimeout(timer);
  }, [mounted, reconnectAsync]);

  return null;
}
