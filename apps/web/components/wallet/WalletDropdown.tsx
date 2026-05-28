"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useWalletAuth } from "@/lib/hooks/useWalletAuth";
import { useSessionStore, useUIStore } from "@/lib/stores/session";
import { truncateAddress } from "@/lib/utils";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export function WalletDropdown() {
  const [mounted, setMounted] = useState(false);
  const { creditBalance, token } = useSessionStore();
  const { setConnectOpen, setDepositOpen, setWithdrawOpen } = useUIStore();
  const { signOut, isSignedIn, isWalletLinked, wallet, address } = useWalletAuth();

  const { data } = useQuery({
    queryKey: ["credits", token],
    queryFn: () =>
      apiFetch<{ balance: number }>("/api/credits/balance", {
        token: token ?? undefined,
      }),
    enabled: !!token,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (data?.balance !== undefined) {
      useSessionStore.getState().setCreditBalance(data.balance);
    }
  }, [data?.balance]);

  const walletConnected = mounted && isWalletLinked;
  const signedIn = mounted && isSignedIn && !!token;
  const walletLabel = walletConnected
    ? truncateAddress(wallet ?? address ?? "")
    : "Connect";
  const balanceLabel =
    mounted && token ? creditBalance.toLocaleString() : "0";

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setDepositOpen(true)}
        className="flex items-center gap-2 rounded-full border border-cyan-500/25 bg-white/5 px-3 py-1.5 shadow-[0_0_20px_rgba(34,211,238,0.12)] backdrop-blur-md transition hover:border-cyan-400/40"
      >
        <span className="text-sm font-semibold tabular-nums text-cyan-300">
          {balanceLabel}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">FRX</span>
      </button>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="rounded-full border border-white/10 bg-gradient-to-br from-indigo-600/40 to-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-200"
          >
            {walletLabel}
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            className="z-50 min-w-[180px] rounded-xl border border-white/10 bg-slate-950 p-1 shadow-xl"
            sideOffset={8}
          >
            {!walletConnected ? (
              <DropdownMenu.Item
                className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white outline-none hover:bg-white/10"
                onSelect={() => setConnectOpen(true)}
              >
                Connect Wallet
              </DropdownMenu.Item>
            ) : (
              <>
                {!signedIn ? (
                  <DropdownMenu.Item
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-violet-200 outline-none hover:bg-white/10"
                    onSelect={() => setConnectOpen(true)}
                  >
                    Finish sign-in
                  </DropdownMenu.Item>
                ) : (
                  <>
                    <DropdownMenu.Item
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white outline-none hover:bg-white/10"
                      onSelect={() => setDepositOpen(true)}
                    >
                      Swap OKB → FRX
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="cursor-pointer rounded-lg px-3 py-2 text-sm text-white outline-none hover:bg-white/10"
                      onSelect={() => setWithdrawOpen(true)}
                    >
                      Convert FRX → OKB
                    </DropdownMenu.Item>
                  </>
                )}
                <DropdownMenu.Item
                  className="cursor-pointer rounded-lg px-3 py-2 text-sm text-red-300 outline-none hover:bg-white/10"
                  onSelect={() => void signOut()}
                >
                  Disconnect
                </DropdownMenu.Item>
              </>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}
