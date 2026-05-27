"use client";

import { useCallback, useEffect } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useSwitchChain,
} from "wagmi";
import { UserRejectedRequestError } from "viem";
import { apiFetch } from "@/lib/api";
import { OKX_WALLET_CONNECTOR_ID, xLayer } from "@/lib/wagmi/config";
import { isOkxWalletInstalled, parseWalletConnectError } from "@/lib/wagmi/okx";
import { useSessionStore } from "@/lib/stores/session";

function friendlyConnectError(err: unknown): string {
  if (err instanceof UserRejectedRequestError) {
    return parseWalletConnectError(err);
  }
  return parseWalletConnectError(err);
}

export function useWalletAuth() {
  const { address, isConnected, chainId } = useAccount();
  const { connectAsync, connectors, isPending: connecting, error: connectError, reset } =
    useConnect();
  const { switchChainAsync } = useSwitchChain();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { token, wallet, setSession, clearSession } = useSessionStore();

  const okxConnector = connectors.find((c) => c.id === OKX_WALLET_CONNECTOR_ID);

  /** Signed in + wagmi connected — use for UI, not wagmi address alone. */
  const isSignedIn = !!token && !!wallet && isConnected;

  useEffect(() => {
    if (!isConnected && token) {
      clearSession();
    }
  }, [isConnected, token, clearSession]);

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

  const connectWith = useCallback(async () => {
    if (!okxConnector) {
      throw new Error("OKX Wallet connector is not configured.");
    }
    if (!isOkxWalletInstalled()) {
      throw new Error(
        "OKX Wallet extension not detected. Install it from the Chrome Web Store, then refresh this page."
      );
    }
    reset();
    const result = await connectAsync({ connector: okxConnector });
    if (result.chainId !== xLayer.id) {
      try {
        await switchChainAsync({ chainId: xLayer.id });
      } catch (err) {
        if (err instanceof UserRejectedRequestError) {
          throw new Error(
            "Wallet connected, but X Layer Testnet was not approved. Switch to X Layer Testnet in OKX and try again."
          );
        }
        throw err;
      }
    }
  }, [connectAsync, okxConnector, reset, switchChainAsync]);

  const connectWallet = useCallback(async () => {
    await connectWith();
  }, [connectWith]);

  const ensureConnected = useCallback(async (): Promise<`0x${string}` | undefined> => {
    if (address) return address;
    if (!okxConnector || !isOkxWalletInstalled()) return undefined;
    const result = await connectAsync({ connector: okxConnector });
    if (result.chainId !== xLayer.id) {
      await switchChainAsync({ chainId: xLayer.id });
    }
    return result.accounts[0];
  }, [address, connectAsync, okxConnector, switchChainAsync]);

  const signIn = useCallback(async () => {
    const wallet = address ?? (await ensureConnected());
    if (!wallet) return;

    const session = useSessionStore.getState();
    if (
      session.wallet &&
      session.wallet.toLowerCase() !== wallet.toLowerCase()
    ) {
      clearSession();
    }

    const { message } = await apiFetch<{ message: string; nonce: string }>(
      "/api/auth/challenge",
      { method: "POST", body: JSON.stringify({ wallet }) }
    );
    const signature = await signMessageAsync({ message });
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
      body: JSON.stringify({ wallet, message, signature }),
    });
    setSession({
      token: result.token,
      wallet: result.user.wallet,
      creditBalance: result.user.creditBalance,
      role: result.user.role,
    });
    return result;
  }, [address, clearSession, ensureConnected, signMessageAsync, setSession]);

  const signOut = useCallback(async () => {
    clearSession();
    disconnect();
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => {});
  }, [clearSession, disconnect]);

  const ensureSignedIn = useCallback(async (): Promise<{
    token: string;
    wallet: `0x${string}`;
  }> => {
    const walletAddr = address ?? (await ensureConnected());
    if (!walletAddr) {
      throw new Error("Connect OKX Wallet on X Layer Testnet first.");
    }
    if (chainId != null && chainId !== xLayer.id) {
      await switchChainAsync({ chainId: xLayer.id });
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
  }, [
    address,
    chainId,
    clearSession,
    ensureConnected,
    signIn,
    switchChainAsync,
  ]);

  return {
    address,
    isConnected,
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
