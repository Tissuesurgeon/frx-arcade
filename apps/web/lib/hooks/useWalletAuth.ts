"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { UserRejectedRequestError } from "viem";
import { apiFetch } from "@/lib/api";
import { OKX_WALLET_CONNECTOR_ID, okxWalletConnector, xLayer } from "@/lib/wagmi/config";
import {
  type AuthChallenge,
  clearCachedAuthChallenge,
  getCachedAuthChallenge,
  setCachedAuthChallenge,
  subscribeAuthChallenge,
} from "@/lib/wagmi/authChallenge";
import {
  disconnectOkxWallet,
  readOkxAccounts,
  requestOkxAccounts,
  signOkxPersonalMessage,
  syncWagmiAfterOkxConnect,
} from "@/lib/wagmi/okxAuth";
import { isOkxWalletInstalled, isWalletManuallyDisconnected, parseWalletConnectError } from "@/lib/wagmi/okx";
import { useSessionStore } from "@/lib/stores/session";

function friendlyConnectError(err: unknown): string {
  if (err instanceof UserRejectedRequestError) {
    return parseWalletConnectError(err);
  }
  return parseWalletConnectError(err);
}

async function fetchAuthChallenge(wallet: `0x${string}`): Promise<AuthChallenge> {
  const normalized = wallet.toLowerCase();
  const cached = getCachedAuthChallenge(normalized);
  if (cached) return cached;

  const { message, nonce } = await apiFetch<{ message: string; nonce: string }>(
    "/api/auth/challenge",
    { method: "POST", body: JSON.stringify({ wallet }) }
  );

  const challenge: AuthChallenge = { message, nonce, wallet: normalized };
  setCachedAuthChallenge(challenge);
  return challenge;
}

function useSignInReady(wallet?: `0x${string}`): boolean {
  return useSyncExternalStore(
    subscribeAuthChallenge,
    () => (wallet ? !!getCachedAuthChallenge(wallet) : false),
    () => false
  );
}

export function useWalletAuth() {
  const { address, isConnected, chainId, status } = useAccount();
  const { connectors, isPending: connecting, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { token, wallet, setSession, clearSession } = useSessionStore();
  const [linkedWallet, setLinkedWallet] = useState<`0x${string}` | null>(null);
  const [challengeLoading, setChallengeLoading] = useState(false);
  const [disconnected, setDisconnected] = useState(() =>
    typeof window !== "undefined" ? isWalletManuallyDisconnected() : false
  );

  const okxConnector =
    connectors.find((c) => c.id === OKX_WALLET_CONNECTOR_ID) ?? okxWalletConnector;

  const activeWallet =
    disconnected ? undefined : ((address ?? linkedWallet) as `0x${string}` | undefined);
  const isWalletLinked = !!activeWallet;
  const isWalletConnected = isConnected && !!address;
  const isSignedIn = !!token && !!wallet && isWalletLinked;
  const signInReady = useSignInReady(activeWallet);

  useEffect(() => {
    if (isWalletManuallyDisconnected()) {
      setDisconnected(true);
      setLinkedWallet(null);
      return;
    }
    let cancelled = false;
    void readOkxAccounts().then((acct) => {
      if (!cancelled && acct) setLinkedWallet(acct);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isWalletManuallyDisconnected() || disconnected) return;
    if (address) setLinkedWallet(address);
  }, [address, disconnected]);

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;
    if (status === "disconnected" && token && !linkedWallet) {
      clearSession();
    }
  }, [status, token, linkedWallet, clearSession]);

  useEffect(() => {
    if (
      token &&
      wallet &&
      activeWallet &&
      wallet.toLowerCase() !== activeWallet.toLowerCase()
    ) {
      clearSession();
      disconnect();
    }
  }, [token, wallet, activeWallet, clearSession, disconnect]);

  const prefetchSignInChallenge = useCallback(
    async (walletOverride?: `0x${string}`): Promise<AuthChallenge | null> => {
      const walletAddr =
        walletOverride ?? activeWallet ?? (await readOkxAccounts());
      if (!walletAddr) return null;

      if (getCachedAuthChallenge(walletAddr)) {
        return getCachedAuthChallenge(walletAddr)!;
      }

      setChallengeLoading(true);
      try {
        return await fetchAuthChallenge(walletAddr);
      } finally {
        setChallengeLoading(false);
      }
    },
    [activeWallet]
  );

  /** Step 1 — OKX connect popup only. No wagmi sync here (blocks sign popup). */
  const connectWallet = useCallback(async (): Promise<`0x${string}`> => {
    if (!isOkxWalletInstalled()) {
      throw new Error(
        "OKX Wallet extension not detected. Install it from the Chrome Web Store, then refresh this page."
      );
    }
    setDisconnected(false);
    const walletAddr = await requestOkxAccounts();
    setLinkedWallet(walletAddr);
    void prefetchSignInChallenge(walletAddr);
    return walletAddr;
  }, [prefetchSignInChallenge]);

  const completeSignIn = useCallback(
    async (walletAddr: `0x${string}`, challenge: AuthChallenge) => {
      const signature = await signOkxPersonalMessage(walletAddr, challenge.message);

      const result = await apiFetch<{
        token: string;
        user: {
          id: string;
          wallet: string;
          creditBalance: number;
          role: "PLAYER" | "ADMIN";
        };
      }>("/api/auth/verify", {
        method: "POST",
        body: JSON.stringify({
          wallet: walletAddr,
          message: challenge.message,
          signature,
        }),
      });

      clearCachedAuthChallenge(walletAddr);

      setSession({
        token: result.token,
        wallet: result.user.wallet,
        creditBalance: result.user.creditBalance,
        role: result.user.role,
      });

      void syncWagmiAfterOkxConnect();
      return result;
    },
    [setSession]
  );

  const signIn = useCallback(
    async (walletOverride?: `0x${string}`, challengeOverride?: AuthChallenge) => {
      const walletAddr =
        walletOverride ??
        activeWallet ??
        (await readOkxAccounts()) ??
        (await requestOkxAccounts());

      setLinkedWallet(walletAddr);
      const normalized = walletAddr.toLowerCase();

      const session = useSessionStore.getState();
      if (session.wallet && session.wallet.toLowerCase() !== normalized) {
        clearSession();
      }

      const challenge =
        challengeOverride ??
        getCachedAuthChallenge(normalized) ??
        (() => {
          throw new Error(
            "Sign-in message not ready yet. Wait a moment, then click Approve sign-in message again."
          );
        })();

      return completeSignIn(walletAddr, challenge);
    },
    [activeWallet, clearSession, completeSignIn]
  );

  const ensureConnected = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (activeWallet) return activeWallet;
    if (!isOkxWalletInstalled()) return undefined;
    return connectWallet();
  }, [activeWallet, connectWallet]);

  const signOut = useCallback(async () => {
    clearSession();
    setLinkedWallet(null);
    setDisconnected(true);
    clearCachedAuthChallenge();
    await disconnectOkxWallet();
    disconnect();
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, [clearSession, disconnect]);

  const ensureSignedIn = useCallback(async (): Promise<{
    token: string;
    wallet: `0x${string}`;
  }> => {
    const walletAddr = activeWallet ?? (await connectWallet());
    const normalized = walletAddr.toLowerCase();

    const session = useSessionStore.getState();
    const walletMatches = session.wallet?.toLowerCase() === normalized;

    if (session.token && !walletMatches) {
      clearSession();
    }

    let authToken = walletMatches ? session.token : null;
    if (!authToken) {
      const challenge = getCachedAuthChallenge(normalized);
      if (!challenge) {
        throw new Error(
          "Sign in required. Open the wallet menu, connect OKX, then click Approve sign-in message (step 2)."
        );
      }
      await completeSignIn(walletAddr, challenge);
      authToken = useSessionStore.getState().token;
    }

    const sessionWallet = useSessionStore.getState().wallet as `0x${string}` | null;
    const resolvedWallet = sessionWallet ?? walletAddr;
    if (!authToken) {
      throw new Error("Sign in failed. Approve the message in OKX Wallet.");
    }

    if (chainId != null && chainId !== xLayer.id) {
      try {
        await switchChainAsync({ chainId: xLayer.id });
      } catch {
        // swap path switches via direct OKX provider
      }
    }

    return { token: authToken, wallet: resolvedWallet };
  }, [activeWallet, chainId, clearSession, completeSignIn, connectWallet, switchChainAsync]);

  return {
    address: activeWallet,
    isConnected: isWalletLinked,
    isWalletConnected,
    isWalletLinked,
    isSignedIn,
    chainId,
    token,
    wallet,
    connecting,
    connectError,
    challengeLoading,
    signInReady,
    friendlyConnectError,
    okxInstalled: isOkxWalletInstalled(),
    connectWallet,
    prefetchSignInChallenge,
    ensureConnected,
    connectOkx: connectWallet,
    signIn,
    ensureSignedIn,
    signOut,
    connectors,
  };
}
