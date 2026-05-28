"use client";

import { useEffect, useState } from "react";
import { useReconnect } from "wagmi";
import { useSessionStore } from "@/lib/stores/session";

/** Only restore wagmi after the user is signed in — avoids stealing OKX popup slots during auth. */
export function WagmiAutoReconnect() {
  const { reconnectAsync } = useReconnect();
  const token = useSessionStore((s) => s.token);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !token) return;
    void reconnectAsync().catch(() => {});
  }, [mounted, token, reconnectAsync]);

  return null;
}
