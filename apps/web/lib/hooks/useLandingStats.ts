"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function useLandingStats() {
  return useQuery({
    queryKey: ["landing-stats"],
    queryFn: () =>
      apiFetch<{
        activePlayers: number;
        liveTournaments: number;
        totalRewardsDistributed: number;
        weeklyJackpotCredits: number;
      }>("/api/stats/landing"),
    refetchInterval: 30_000,
  });
}
