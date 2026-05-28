"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useJackpotTick } from "@/lib/hooks/useSocket";

/** Live weekly jackpot total — settled + pending daily pool contributions. */
export function useWeeklyJackpot() {
  const [liveCredits, setLiveCredits] = useState<number | null>(null);

  const { data } = useQuery({
    queryKey: ["season-current"],
    queryFn: () =>
      apiFetch<{ weeklyJackpotCredits: number }>("/api/seasons/current"),
    refetchInterval: 15_000,
  });

  useJackpotTick(
    useCallback((tick) => {
      setLiveCredits(tick.poolCredits);
    }, [])
  );

  useEffect(() => {
    if (data?.weeklyJackpotCredits != null) {
      setLiveCredits(data.weeklyJackpotCredits);
    }
  }, [data?.weeklyJackpotCredits]);

  return {
    weeklyJackpotCredits: liveCredits ?? data?.weeklyJackpotCredits ?? 0,
    isLive: liveCredits != null,
  };
}
