"use client";

import { useCallback, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSwitchChain,
} from "wagmi";
import { UserRejectedRequestError } from "viem";
import { apiFetch } from "@/lib/api";
import { OKX_WALLET_CONNECTOR_ID, okxWalletConnector, xLayer } from "@/lib/wagmi/config";
import { connectOkxWallet } from "@/lib/wagmi/connect";
import { signWalletMessage } from "@/lib/wagmi/sign";
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
  const { connectAsync, connectors, isPending: connecting, error: connectError, reset } =
    useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { token, wallet, setSession, clearSession } = useSessionStore();

  const okxConnector =
    connectors.find((c) => c.id === OKX_WALLET_CONNECTOR_ID) ?? okxWalletConnector;

  /** Wallet linked in OKX (wagmi). */
  const isWalletConnected = isConnected && !!address;
  /** Wallet linked + SIWE session. */
  const isSignedIn = !!token && !!wallet && isWalletConnected;

  useEffect(() => {
    if (status === "connecting" || status === "reconnecting") return;
    if (status === "disconnected" && token) {
      clearSession();
    }
  }, [status, token, clearSession]);

  useEffect(() => {
    if (
      token &&
      wallet &&
      address &&
      wallet.toLowerCase() !== address.toLowerCase()
    ) {
      clearSession();
      disconnect();
    }
  }, [token, wallet, address, clearSession, disconnect]);

  const connectWith = useCallback(async (): Promise<`0x${string}`> => {
    if (!okxConnector) {
      throw new Error("OKX Wallet connector is not configured.");
    }
    if (!isOkxWalletInstalled()) {
      throw new Error(
        "OKX Wallet extension not detected. Install it from the Chrome Web Store, then refresh this page."
      );
    }
    reset();
    return connectOkxWallet({
      address,
      connector: okxConnector,
      connectAsync,
      switchChainAsync,
    });
  }, [address, connectAsync, okxConnector, reset, switchChainAsync]);

  const connectWallet = useCallback(async () => {
    await connectWith();
  }, [connectWith]);

  const ensureConnected = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (address) return address;
    if (!okxConnector || !isOkxWalletInstalled()) return undefined;
    return connectOkxWallet({
      connector: okxConnector,
      connectAsync,
      switchChainAsync,
    });
  }, [address, connectAsync, okxConnector, switchChainAsync]);

  const signIn = useCallback(async () => {
    const walletAddr = await connectWith();
    if (!walletAddr) {
      throw new Error(
        "OKX Wallet not ready. Unlock the extension, switch to X Layer Testnet, and try again."
      );
    }

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
    const signature = await signWalletMessage(walletAddr, message);
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
    return result;
  }, [clearSession, connectWith, setSession]);

  const signOut = useCallback(async () => {
    clearSession();
    disconnect();
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, [clearSession, disconnect]);

  const ensureSignedIn = useCallback(async (): Promise<{
    token: string;
    wallet: `0x${string}`;
  }> => {
    const walletAddr = await connectWith();
    if (chainId != null && chainId !== xLayer.id) {
      try {
        await switchChainAsync({ chainId: xLayer.id });
      } catch {
        // continue — user may switch manually
      }
    }

    const session = useSessionStore.getState();
    const walletMatches =
      session.wallet?.toLowerCase() === walletAddr.toLowerCase();

    if (session.token && !walletMatches) {
      clearSession();
    }

    let authToken = walletMatches ? session.token : null;
    if (!authToken) {
      await signIn();
      authToken = useSessionStore.getState().token;
    }
    const sessionWallet = useSessionStore.getState().wallet as `0x${string}` | null;
    const resolvedWallet = sessionWallet ?? walletAddr;
    if (!authToken) {
      throw new Error("Sign in failed. Approve the message in OKX Wallet.");
    }
    return { token: authToken, wallet: resolvedWallet };
  }, [chainId, clearSession, connectWith, signIn, switchChainAsync]);

  return {
    address,
    isConnected,
    isWalletConnected,
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
