"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Loader2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { CREDITS_PER_USD } from "@frx/shared";
import { apiFetch } from "@/lib/api";
import { XLAYER_EXPLORER } from "@/lib/contracts/swapCreditRouter";
import { useSessionStore, useUIStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

export function WithdrawModal() {
  const { withdrawOpen, setWithdrawOpen } = useUIStore();
  const { token, creditBalance, setCreditBalance } = useSessionStore();
  const { isConnected } = useAccount();
  const [amount, setAmount] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const credits = Number(amount);
  const validCredits =
    Number.isInteger(credits) && credits > 0 && credits <= creditBalance;

  const { data: depositConfig } = useQuery({
    queryKey: ["deposit-config"],
    queryFn: () =>
      apiFetch<{
        okbUsdPrice: number | null;
        withdrawEnabled: boolean;
      }>("/api/credits/deposit/config"),
    enabled: withdrawOpen,
  });

  const { data: quote, isLoading: quoteLoading } = useQuery({
    queryKey: ["withdraw-quote", credits],
    queryFn: () =>
      apiFetch<{
        estimatedOkb: string;
        okbUsdPrice: number;
        withdrawEnabled: boolean;
        payoutBalanceOkb: string;
      }>(`/api/credits/withdraw/quote?credits=${credits}`),
    enabled: withdrawOpen && validCredits,
  });

  const estimatedUsd = useMemo(() => {
    if (!quote?.okbUsdPrice || !quote.estimatedOkb) return 0;
    const okb = Number(quote.estimatedOkb);
    if (!Number.isFinite(okb) || okb <= 0) return 0;
    return okb * quote.okbUsdPrice;
  }, [quote]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<{
        balance: number;
        okbOut: string;
        txHash: string;
      }>("/api/credits/withdraw", {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ amountCredits: credits }),
      }),
    onSuccess: (data) => {
      setCreditBalance(data.balance);
      setLastTxHash(data.txHash);
      void queryClient.invalidateQueries({ queryKey: ["credits"] });
    },
  });

  const withdrawEnabled =
    depositConfig?.withdrawEnabled !== false && quote?.withdrawEnabled !== false;
  const busy = mutation.isPending;

  return (
    <Dialog.Root
      open={withdrawOpen}
      onOpenChange={(open) => {
        setWithdrawOpen(open);
        if (!open) {
          setLastTxHash(null);
          mutation.reset();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,400px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-violet-500/20 bg-slate-950/95 p-6 shadow-2xl"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold text-white">
                Convert FRX → OKB
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-400">
                Redeem gameplay credits for testnet OKB at the same rate as
                deposits ({CREDITS_PER_USD} credits per $1).
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <p className="mt-4 text-sm text-slate-300">
            Balance:{" "}
            <span className="font-semibold tabular-nums text-violet-200">
              {creditBalance.toLocaleString()}
            </span>{" "}
            FRX
          </p>

          {!withdrawEnabled ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
              Redemption is not configured on this server. Set{" "}
              <code className="text-xs">PRIVATE_KEY</code> on the backend with a
              funded testnet OKB wallet.
            </p>
          ) : (
            <>
              <label className="mt-4 block text-xs uppercase tracking-wider text-slate-500">
                FRX credits to redeem
              </label>
              <input
                type="number"
                min={1}
                max={creditBalance}
                step={1}
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-white outline-none focus:border-violet-500/50"
              />
              <button
                type="button"
                className="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200"
                onClick={() => setAmount(String(creditBalance))}
              >
                Use max ({creditBalance.toLocaleString()} FRX)
              </button>

              <p className="mt-2 text-xs text-slate-500">
                OKB price:{" "}
                {depositConfig?.okbUsdPrice
                  ? `$${depositConfig.okbUsdPrice.toFixed(2)}`
                  : "loading…"}
              </p>
              <p className="mt-1 text-sm text-violet-200">
                {quoteLoading && validCredits
                  ? "Estimating OKB…"
                  : validCredits && quote
                    ? `Estimated: ~${quote.estimatedOkb} OKB${
                        estimatedUsd > 0 ? ` (~$${estimatedUsd.toFixed(2)} USD)` : ""
                      }`
                    : "Enter credits to see OKB estimate"}
              </p>
              {validCredits && quote && Number(quote.estimatedOkb) <= 0 ? (
                <p className="mt-1 text-xs text-amber-300">
                  Amount too small for 1 wei of OKB at the current price.
                </p>
              ) : null}

              <button
                type="button"
                disabled={
                  busy ||
                  !token ||
                  !isConnected ||
                  !validCredits ||
                  !withdrawEnabled ||
                  !quote ||
                  Number(quote.estimatedOkb) <= 0
                }
                onClick={() => mutation.mutate()}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {busy ? "Sending OKB…" : "Convert to OKB"}
              </button>
            </>
          )}

          {mutation.error ? (
            <p className="mt-3 text-xs text-red-300">
              {mutation.error instanceof Error
                ? mutation.error.message
                : "Redemption failed"}
            </p>
          ) : null}

          {lastTxHash ? (
            <p className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Sent OKB to your wallet.{" "}
              <a
                href={`${XLAYER_EXPLORER}/tx/${lastTxHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-semibold underline"
              >
                View tx
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>
          ) : null}

          {!isConnected ? (
            <p className="mt-3 text-xs text-amber-300">
              Connect OKX Wallet on X Layer Testnet first.
            </p>
          ) : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
