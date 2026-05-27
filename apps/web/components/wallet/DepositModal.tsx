"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";
import {
  useReadContract,
  useWaitForTransactionReceipt,
  useWalletClient,
} from "wagmi";
import {
  BaseError,
  ContractFunctionRevertedError,
  encodeFunctionData,
  parseEther,
} from "viem";
import { computeCreditsFromOkbWei, CREDITS_PER_USD } from "@frx/shared";
import { apiFetch } from "@/lib/api";
import {
  swapCreditRouterAbi,
  resolveSwapCreditRouterAddress,
} from "@/lib/contracts/swapCreditRouter";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useSessionStore, useUIStore } from "@/lib/stores/session";
import { xLayer } from "@/lib/wagmi/config";
import { xLayerPublicClient } from "@/lib/wagmi/xlayerClient";
import { cn } from "@/lib/utils";

function parseSwapError(err: unknown): string {
  if (err instanceof BaseError) {
    const reverted = err.walk(
      (e) => e instanceof ContractFunctionRevertedError
    );
    if (reverted instanceof ContractFunctionRevertedError) {
      const reason = reverted.reason?.toLowerCase() ?? "";
      if (reason.includes("credits too small")) {
        return "Amount too small — use at least 0.001 OKB at the current price.";
      }
      if (reason.includes("price not set")) {
        return "OKB price not set on router yet. Wait a minute and try again.";
      }
      return reverted.reason ?? reverted.shortMessage;
    }
    const msg = err.message.toLowerCase();
    if (msg.includes("insufficient funds")) {
      return "Not enough OKB in your wallet for this swap plus gas.";
    }
    if (msg.includes("user rejected") || msg.includes("user denied")) {
      return "Swap cancelled in OKX Wallet.";
    }
    return err.shortMessage;
  }
  if (err instanceof Error) return err.message.split("\n")[0];
  return "Could not start swap";
}

export function DepositModal() {
  const { depositOpen, setDepositOpen, setConnectOpen } = useUIStore();
  const { setCreditBalance } = useSessionStore();
  const {
    isConnected,
    isSignedIn,
    chainId,
    ensureSignedIn,
  } = useWalletAuth();
  const [amount, setAmount] = useState("0.01");
  const [localError, setLocalError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const queryClient = useQueryClient();
  const { data: walletClient } = useWalletClient();

  const {
    data: depositConfig,
    isPending: configLoading,
    isError: configError,
    error: configQueryError,
  } = useQuery({
    queryKey: ["deposit-config"],
    queryFn: () =>
      apiFetch<{
        configured: boolean;
        creditsPerUsd: number;
        okbUsdPrice: number | null;
        okbUsdPriceE8: string | null;
        priceSource: string | null;
        swapCreditRouterAddress: string | null;
        frxArcadeHookAddress: string | null;
      }>("/api/credits/deposit/config"),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const routerAddress = resolveSwapCreditRouterAddress(
    depositConfig?.swapCreditRouterAddress
  );

  const { data: onChainPriceE8 } = useReadContract({
    address: routerAddress,
    abi: swapCreditRouterAbi,
    functionName: "okbUsdPriceE8",
    chainId: xLayer.id,
    query: { enabled: !!routerAddress },
  });

  const okbUsdPrice = useMemo(() => {
    if (depositConfig?.okbUsdPrice && depositConfig.okbUsdPrice > 0) {
      return depositConfig.okbUsdPrice;
    }
    if (depositConfig?.okbUsdPriceE8) {
      const fromApi = Number(depositConfig.okbUsdPriceE8) / 1e8;
      if (fromApi > 0) return fromApi;
    }
    if (onChainPriceE8 && onChainPriceE8 > 0n) {
      return Number(onChainPriceE8) / 1e8;
    }
    return null;
  }, [depositConfig, onChainPriceE8]);

  const serverConfigured =
    depositConfig === undefined ? null : depositConfig.configured;
  const wrongChain =
    isConnected && chainId != null && chainId !== xLayer.id;

  const estimatedCredits = useMemo(() => {
    if (!okbUsdPrice) return 0;
    try {
      const wei = parseEther(amount || "0");
      return Number(computeCreditsFromOkbWei(wei, okbUsdPrice));
    } catch {
      return 0;
    }
  }, [amount, okbUsdPrice]);

  const estimatedUsd = useMemo(() => {
    if (!okbUsdPrice) return 0;
    const okb = Number(amount || "0");
    if (!Number.isFinite(okb) || okb <= 0) return 0;
    return okb * okbUsdPrice;
  }, [amount, okbUsdPrice]);

  const {
    isLoading: confirming,
    isSuccess: confirmed,
    isError: confirmError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: xLayer.id,
    query: { retry: 3, enabled: !!txHash },
  });

  const creditMutation = useMutation({
    mutationFn: async (txHash: `0x${string}`) => {
      const wei = parseEther(amount).toString();
      const authToken = useSessionStore.getState().token;
      return apiFetch<{ balance: number; credited: number }>(
        "/api/credits/deposit",
        {
          method: "POST",
          token: authToken ?? undefined,
          body: JSON.stringify({ amountWei: wei, txHash }),
        }
      );
    },
    onSuccess: (data) => {
      setCreditBalance(data.balance);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
      void queryClient.invalidateQueries({ queryKey: ["hook-metrics"] });
      setDepositOpen(false);
      setTxHash(undefined);
      setLocalError(null);
    },
  });

  const syncedHashRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      confirmed &&
      txHash &&
      syncedHashRef.current !== txHash &&
      !creditMutation.isPending
    ) {
      syncedHashRef.current = txHash;
      void creditMutation.mutateAsync(txHash);
    }
  }, [confirmed, txHash, creditMutation.isPending, creditMutation.mutateAsync]);

  useEffect(() => {
    if (!depositOpen) {
      setLocalError(null);
      setSigningIn(false);
      setSubmitting(false);
      setTxHash(undefined);
    }
  }, [depositOpen]);

  const busy = submitting || confirming || creditMutation.isPending || signingIn;

  async function handleSignIn() {
    setLocalError(null);
    setSigningIn(true);
    try {
      await ensureSignedIn();
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Sign in failed"
      );
    } finally {
      setSigningIn(false);
    }
  }

  async function handleConvert() {
    if (!routerAddress) return;
    setLocalError(null);
    setSigningIn(true);
    setSubmitting(true);
    try {
      const { wallet: walletAddr } = await ensureSignedIn();
      const value = parseEther(amount);

      await xLayerPublicClient.simulateContract({
        address: routerAddress,
        abi: swapCreditRouterAbi,
        functionName: "swapForCredits",
        value,
        account: walletAddr,
      });

      if (!walletClient) {
        throw new Error("OKX Wallet not ready. Reconnect and try again.");
      }

      const hash = await walletClient.sendTransaction({
        account: walletAddr,
        chain: xLayer,
        to: routerAddress,
        value,
        data: encodeFunctionData({
          abi: swapCreditRouterAbi,
          functionName: "swapForCredits",
        }),
        gas: 120_000n,
      });
      setTxHash(hash);
    } catch (err) {
      setLocalError(parseSwapError(err));
    } finally {
      setSigningIn(false);
      setSubmitting(false);
    }
  }

  async function retryCreditSync() {
    if (!txHash) return;
    setLocalError(null);
    syncedHashRef.current = null;
    await creditMutation.mutateAsync(txHash);
  }

  const swapDisabledReason = useMemo(() => {
    if (busy) return null;
    if (!isSignedIn) return null;
    if (estimatedCredits <= 0) return "Amount too small for 1 credit at the current OKB price.";
    if (!okbUsdPrice) return "Waiting for OKB/USD price…";
    return null;
  }, [busy, isSignedIn, estimatedCredits, okbUsdPrice]);

  const errorMessage =
    localError ??
    (confirmError ? "Transaction failed on-chain. Try again with ≥ 0.001 OKB." : null) ??
    (creditMutation.error instanceof Error
      ? creditMutation.error.message
      : creditMutation.error
        ? "Conversion sync failed"
        : null);

  return (
    <Dialog.Root
      open={depositOpen}
      onOpenChange={(open) => {
        setDepositOpen(open);
        if (!open) setTxHash(undefined);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-indigo-500/20 bg-slate-950/95 p-6 shadow-2xl"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold text-white">
                Swap OKB → FRX Credits
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-400">
                Sign in, then swap testnet OKB through the FRX V4 hook pool.
                Credits appear in your balance after the tx confirms.
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {configLoading && !routerAddress ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading swap configuration…
            </p>
          ) : !routerAddress ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Swap router not configured. Set{" "}
              <code className="text-xs">NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS</code>{" "}
              in the repo root <code className="text-xs">.env</code>, then restart{" "}
              <code className="text-xs">npm run dev</code>.
            </p>
          ) : serverConfigured === false ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Backend swap verification is not configured. Set{" "}
              <code className="text-xs">SWAP_CREDIT_ROUTER_ADDRESS</code>,{" "}
              <code className="text-xs">FRX_ARCADE_HOOK_ADDRESS</code>, and{" "}
              <code className="text-xs">POOL_MANAGER_ADDRESS</code> in{" "}
              <code className="text-xs">.env</code> and restart the backend.
            </p>
          ) : !isConnected ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-amber-200">
                Connect OKX Wallet on X Layer Testnet before swapping.
              </p>
              <button
                type="button"
                onClick={() => {
                  setDepositOpen(false);
                  setConnectOpen(true);
                }}
                className="flex w-full items-center justify-center rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white"
              >
                Connect wallet
              </button>
            </div>
          ) : wrongChain ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Switch OKX Wallet to <strong>X Layer Testnet</strong> (chain{" "}
              {xLayer.id}), then try again.
            </p>
          ) : !isSignedIn ? (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-slate-300">
                Wallet connected — sign a message to link your FRX account before
                swapping. Your credits are tied to this sign-in.
              </p>
              <button
                type="button"
                disabled={signingIn}
                onClick={() => void handleSignIn()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {signingIn && <Loader2 className="h-4 w-4 animate-spin" />}
                Sign in to FRX Arcade
              </button>
            </div>
          ) : (
            <>
              <p className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                Signed in — swaps will credit your FRX balance automatically.
              </p>
              <label className="mt-4 block text-xs uppercase tracking-wider text-slate-500">
                Amount (OKB testnet)
              </label>
              <input
                type="number"
                step="0.001"
                min="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-cyan-500/50"
              />
              <p className="mt-2 text-xs text-slate-500">
                OKB price:{" "}
                {okbUsdPrice
                  ? `$${okbUsdPrice.toFixed(2)}`
                  : "loading…"}
                {depositConfig?.priceSource
                  ? ` (${depositConfig.priceSource})`
                  : onChainPriceE8
                    ? " (on-chain)"
                    : null}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Rate: ${(1 / CREDITS_PER_USD).toFixed(2)} USD = 1 FRX credit (
                {CREDITS_PER_USD} credits per $1)
              </p>
              <p className="mt-1 text-sm text-cyan-200">
                Estimated: ~{estimatedCredits.toLocaleString()} FRX credits
                {estimatedUsd > 0 ? ` (~$${estimatedUsd.toFixed(2)} USD)` : null}
              </p>
              {estimatedCredits === 0 && Number(amount) > 0 ? (
                <p className="mt-1 text-xs text-amber-300">
                  Amount too small for 1 credit at the current OKB price.
                </p>
              ) : null}
              <button
                type="button"
                disabled={busy || !isSignedIn || estimatedCredits <= 0 || !okbUsdPrice}
                onClick={() => void handleConvert()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {confirming
                  ? "Confirming swap…"
                  : submitting
                    ? "Approve in OKX…"
                    : "Swap OKB → FRX Credits"}
              </button>
              {swapDisabledReason ? (
                <p className="mt-2 text-xs text-amber-300">{swapDisabledReason}</p>
              ) : null}
              {configError && routerAddress ? (
                <p className="mt-2 text-xs text-amber-300">
                  API price feed unavailable
                  {configQueryError instanceof Error
                    ? `: ${configQueryError.message}`
                    : ""}
                  . Using on-chain price when available.
                </p>
              ) : null}
              {txHash && creditMutation.isError ? (
                <button
                  type="button"
                  disabled={creditMutation.isPending}
                  onClick={() => void retryCreditSync()}
                  className="mt-2 w-full rounded-lg border border-cyan-500/30 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-500/10"
                >
                  Swap confirmed — retry crediting balance
                </button>
              ) : null}
            </>
          )}

          {errorMessage ? (
            <p className="mt-3 text-xs text-red-300">{errorMessage}</p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
