"use client";

import { useCallback, useEffect, useState } from "react";
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
  readOkxAccounts,
  requestOkxAccounts,
  signOkxPersonalMessage,
  syncWagmiAfterOkxConnect,
} from "@/lib/wagmi/okxAuth";
import { isOkxWalletInstalled, parseWalletConnectError } from "@/lib/wagmi/okx";
import { useSessionStore } from "@/lib/stores/session";

function friendlyConnectError(err: unknown): string {
  if (err instanceof UserRejectedRequestError) {
    return parseWalletConnectError(err);
  }
  return parseWalletConnectError(err);
}

export function useWalletAuth() {
  const { address, isConnected, chainId, status } = useAccount();
  const { connectors, isPending: connecting, error: connectError } = useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { token, wallet, setSession, clearSession } = useSessionStore();
  const [linkedWallet, setLinkedWallet] = useState<`0x${string}` | null>(null);

  const okxConnector =
    connectors.find((c) => c.id === OKX_WALLET_CONNECTOR_ID) ?? okxWalletConnector;

  const activeWallet = (address ?? linkedWallet) as `0x${string}` | undefined;
  const isWalletLinked = !!activeWallet;
  const isWalletConnected = isConnected && !!address;
  const isSignedIn = !!token && !!wallet && isWalletLinked;

  useEffect(() => {
    let cancelled = false;
    void readOkxAccounts().then((acct) => {
      if (!cancelled && acct) setLinkedWallet(acct);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (address) setLinkedWallet(address);
  }, [address]);

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

  /** Step 1 — OKX connect popup only (no chain switch, no sign). */
  const connectWallet = useCallback(async (): Promise<`0x${string}`> => {
    if (!isOkxWalletInstalled()) {
      throw new Error(
        "OKX Wallet extension not detected. Install it from the Chrome Web Store, then refresh this page."
      );
    }
    const walletAddr = await requestOkxAccounts();
    setLinkedWallet(walletAddr);
    void syncWagmiAfterOkxConnect();
    return walletAddr;
  }, []);

  /** Step 2 — SIWE sign popup only (wallet must already be linked). */
  const signIn = useCallback(async (walletOverride?: `0x${string}`) => {
    const walletAddr =
      walletOverride ??
      activeWallet ??
      (await readOkxAccounts()) ??
      (await requestOkxAccounts());

    setLinkedWallet(walletAddr);

    const session = useSessionStore.getState();
    if (
      session.wallet &&
      session.wallet.toLowerCase() !== walletAddr.toLowerCase()
    ) {
      clearSession();
    }

    const { message } = await apiFetch<{ message: string; nonce: string }>(
      "/api/auth/challenge",
      { method: "POST", body: JSON.stringify({ wallet: walletAddr }) }
    );

    const signature = await signOkxPersonalMessage(walletAddr, message);

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
      body: JSON.stringify({ wallet: walletAddr, message, signature }),
    });

    setSession({
      token: result.token,
      wallet: result.user.wallet,
      creditBalance: result.user.creditBalance,
      role: result.user.role,
    });

    void syncWagmiAfterOkxConnect();
    return result;
  }, [activeWallet, clearSession, setSession]);

  const ensureConnected = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (activeWallet) return activeWallet;
    if (!isOkxWalletInstalled()) return undefined;
    return connectWallet();
  }, [activeWallet, connectWallet]);

  const signOut = useCallback(async () => {
    clearSession();
    setLinkedWallet(null);
    disconnect();
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, [clearSession, disconnect]);

  const ensureSignedIn = useCallback(async (): Promise<{
    token: string;
    wallet: `0x${string}`;
  }> => {
    const walletAddr = activeWallet ?? (await connectWallet());

    const session = useSessionStore.getState();
    const walletMatches =
      session.wallet?.toLowerCase() === walletAddr.toLowerCase();

    if (session.token && !walletMatches) {
      clearSession();
    }

    let authToken = walletMatches ? session.token : null;
    if (!authToken) {
      await signIn(walletAddr);
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
        // chain switch only needed for on-chain actions, not auth
      }
    }

    return { token: authToken, wallet: resolvedWallet };
  }, [activeWallet, chainId, clearSession, connectWallet, signIn, switchChainAsync]);

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
    friendlyConnectError,
    okxInstalled: isOkxWalletInstalled(),
    connectWallet,
    ensureConnected,
    connectOkx: connectWallet,
    signIn,
    ensureSignedIn,
    signOut,
    connectors,
  };
}
