"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ExternalLink, Loader2, Wallet, X } from "lucide-react";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { isOkxWalletInstalled } from "@/lib/wagmi/okx";
import { useUIStore } from "@/lib/stores/session";
import { cn } from "@/lib/utils";

const OKX_INSTALL_URL =
  "https://chromewebstore.google.com/detail/okx-wallet/mcohilncbfahbmgdjkbpemccieolpgea";

const XLAYER_FAUCET_URL = "https://web3.okx.com/xlayer/faucet/xlayerfaucet";

export function WalletConnectModal() {
  const { connectOpen, setConnectOpen } = useUIStore();
  const {
    connectOkx,
    signIn,
    connecting,
    connectError,
    friendlyConnectError,
    isConnected,
    token,
    okxInstalled,
  } = useWalletAuth();

  const [detectedOkx, setDetectedOkx] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!connectOpen) return;
    setLocalError(null);
    setDetectedOkx(isOkxWalletInstalled());

    const refresh = () => setDetectedOkx(isOkxWalletInstalled());
    window.addEventListener("ethereum#initialized", refresh);

    return () => {
      window.removeEventListener("ethereum#initialized", refresh);
    };
  }, [connectOpen]);

  async function handleSignIn() {
    await signIn();
    setConnectOpen(false);
  }

  const showOkx = detectedOkx || okxInstalled;
  const errorMessage =
    localError ??
    (connectError ? friendlyConnectError(connectError) : null);

  async function tryConnect() {
    setLocalError(null);
    try {
      await connectOkx();
    } catch (err) {
      setLocalError(friendlyConnectError(err));
    }
  }

  return (
    <Dialog.Root open={connectOpen} onOpenChange={setConnectOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <Dialog.Content
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2",
            "rounded-2xl border border-cyan-500/20 bg-slate-950/95 p-6 shadow-2xl shadow-cyan-500/10"
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <Dialog.Title className="text-lg font-bold text-white">
                Connect OKX Wallet
              </Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-slate-400">
                OKX Wallet required on X Layer Testnet
              </Dialog.Description>
            </div>
            <Dialog.Close className="rounded-lg p-1 text-slate-400 hover:bg-white/5 hover:text-white">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="mt-6 space-y-3">
            {!isConnected ? (
              <>
                {showOkx ? (
                  <button
                    type="button"
                    onClick={() => void tryConnect()}
                    disabled={connecting}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 px-4 py-3 font-semibold text-white transition hover:brightness-110 disabled:opacity-60"
                  >
                    {connecting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wallet className="h-4 w-4" />
                    )}
                    Connect OKX Wallet
                  </button>
                ) : (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                    <p className="font-medium">OKX Wallet not detected</p>
                    <p className="mt-1 text-xs text-amber-200/80">
                      Install the extension, unlock it, switch to X Layer Testnet,
                      then refresh this page.
                    </p>
                    <a
                      href={OKX_INSTALL_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-300 hover:text-cyan-200"
                    >
                      Get OKX Wallet
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <a
                  href={XLAYER_FAUCET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                >
                  Get X Layer testnet OKB
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>

                {errorMessage ? (
                  <p className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-xs text-red-300">
                    {errorMessage}
                  </p>
                ) : null}

                {showOkx ? (
                  <p className="text-center text-[10px] leading-relaxed text-slate-500">
                    Unlock OKX, approve connect, and select X Layer Testnet. Disable
                    conflicting wallet extensions if connect fails.
                  </p>
                ) : null}
              </>
            ) : !token ? (
              <button
                type="button"
                onClick={() => void handleSignIn()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 font-semibold text-white transition hover:brightness-110"
              >
                Sign in to FRX Arcade
              </button>
            ) : (
              <p className="text-center text-sm text-emerald-400">
                Wallet connected & signed in
              </p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
