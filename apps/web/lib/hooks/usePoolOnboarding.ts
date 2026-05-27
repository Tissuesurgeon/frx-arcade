"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { pickDefaultTournament, getVisibleDailyPools, formatApiError } from "@/lib/tournaments";
import { useSessionStore, useUIStore } from "@/lib/stores/session";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import type { Tournament } from "@frx/shared";

type JoinResponse = {
  participantId: string;
  alreadyJoined: boolean;
  creditBalance?: number;
};

export function usePoolOnboarding() {
  const router = useRouter();
  const { token, creditBalance, setCreditBalance } = useSessionStore();
  const { setConnectOpen, setDepositOpen, setWithdrawOpen } = useUIStore();
  const { ensureConnected, signIn } = useWalletAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ensureAuth = useCallback(async (): Promise<string> => {
    let authToken = token;
    if (!authToken) {
      const wallet = await ensureConnected();
      if (!wallet) {
        setConnectOpen(true);
        throw new Error("Connect OKX Wallet on X Layer Testnet.");
      }
      await signIn();
      authToken = useSessionStore.getState().token;
    }
    if (!authToken) {
      throw new Error("Sign in failed. Approve the message in OKX Wallet.");
    }
    return authToken;
  }, [ensureConnected, setConnectOpen, signIn, token]);

  const joinPool = useCallback(
    async (tournamentId: string) => {
      setLoading(true);
      setError(null);
      try {
        const authToken = await ensureAuth();

        const { tournaments } = await apiFetch<{ tournaments: Tournament[] }>(
          "/api/tournaments"
        );
        const tournament = tournaments.find((t) => t.id === tournamentId);
        if (!tournament) throw new Error("Tournament not found.");

        const existing = await apiFetch<{
          enrolled: boolean;
          completed: boolean;
        }>(`/api/tournaments/${tournamentId}/participant/me`, {
          token: authToken,
        });

        if (existing.enrolled && !existing.completed) {
          router.push(`/play?tournament=${tournamentId}&fresh=1`);
          return;
        }

        const { balance } = await apiFetch<{ balance: number }>(
          "/api/credits/balance",
          { token: authToken }
        );
        setCreditBalance(balance);

        if (
          tournament.type !== "PRACTICE" &&
          balance < tournament.entryFeeCredits
        ) {
          setDepositOpen(true);
          throw new Error(
            `Need ${tournament.entryFeeCredits - balance} more FRX credits. Swap OKB first.`
          );
        }

        const joinResult = await apiFetch<JoinResponse>("/api/tournaments/join", {
          method: "POST",
          token: authToken,
          body: JSON.stringify({ tournamentId }),
        });

        if (joinResult.creditBalance != null) {
          setCreditBalance(joinResult.creditBalance);
        } else {
          const { balance: newBalance } = await apiFetch<{ balance: number }>(
            "/api/credits/balance",
            { token: authToken }
          );
          setCreditBalance(newBalance);
        }

        router.push(`/play?tournament=${tournamentId}&fresh=1`);
      } catch (err) {
        setError(formatApiError(err));
      } finally {
        setLoading(false);
      }
    },
    [ensureAuth, router, setCreditBalance, setDepositOpen]
  );

  const joinCheapestPool = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const authToken = await ensureAuth();
      const { balance } = await apiFetch<{ balance: number }>(
        "/api/credits/balance",
        { token: authToken }
      );
      setCreditBalance(balance);

      const { tournaments } = await apiFetch<{ tournaments: Tournament[] }>(
        "/api/tournaments"
      );
      const picked = pickDefaultTournament(
        getVisibleDailyPools(tournaments.filter((t) => t.type === "DAILY")),
        balance
      );
      if (!picked) {
        setDepositOpen(true);
        throw new Error("Swap OKB to FRX credits, then pick a pool.");
      }
      setLoading(false);
      await joinPool(picked.id);
    } catch (err) {
      setError(formatApiError(err));
      setLoading(false);
    }
  }, [ensureAuth, joinPool, setDepositOpen, setCreditBalance]);

  return {
    loading,
    error,
    creditBalance,
    clearError: () => setError(null),
    joinPool,
    joinCheapestPool,
    openDeposit: () => {
      void ensureAuth()
        .then(() => setDepositOpen(true))
        .catch((err) => setError(formatApiError(err)));
    },
    openWithdraw: () => setWithdrawOpen(true),
    openConnect: () => setConnectOpen(true),
  };
}
