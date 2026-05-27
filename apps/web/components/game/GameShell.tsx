"use client";

import Link from "next/link";
import {
  CircleHelp,
  LayoutDashboard,
  Shield,
  Trophy,
} from "lucide-react";
import { Container } from "@/components/Container";
import { WalletDropdown } from "@/components/wallet/WalletDropdown";
import { useSessionStore } from "@/lib/stores/session";

type GameShellProps = {
  children: React.ReactNode;
  /** Play screen: fill viewport, no page scroll. */
  fixedViewport?: boolean;
};

export function GameShell({ children, fixedViewport = false }: GameShellProps) {
  const role = useSessionStore((s) => s.role);

  return (
    <div
      className={
        fixedViewport
          ? "flex h-dvh max-h-dvh flex-col overflow-hidden bg-frx-bg"
          : "flex min-h-dvh flex-col bg-frx-bg"
      }
    >
      <header
        className="shrink-0 border-b border-white/10 bg-frx-bg/40 backdrop-blur-xl"
        style={{
          boxShadow:
            "0 1px 0 rgba(99, 102, 241, 0.2), 0 8px 32px -12px rgba(99, 102, 241, 0.15)",
        }}
      >
        <Container className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2 sm:gap-x-4 sm:py-3">
          <Link
            href="/"
            className="flex shrink-0 items-baseline gap-1 font-bold tracking-tight"
          >
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-lg text-transparent sm:text-xl">
              FRX
            </span>
            <span className="text-base text-white sm:text-lg">ARCADE</span>
          </Link>

          <nav className="order-3 flex w-full flex-wrap items-center justify-center gap-4 text-xs sm:order-none sm:w-auto sm:gap-6 sm:text-sm">
            <Link href="/demo" className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300">
              <LayoutDashboard className="h-4 w-4 text-indigo-400" />
              Get Started
            </Link>
            <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300">
              <LayoutDashboard className="h-4 w-4 text-slate-500" />
              Dashboard
            </Link>
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300">
              <Trophy className="h-4 w-4 text-amber-400/90" />
              Leaderboard
            </Link>
            <Link href="/#how-to-play" className="flex items-center gap-1.5 text-slate-300 hover:text-cyan-300">
              <CircleHelp className="h-4 w-4 text-cyan-400/80" />
              How to Play
            </Link>
            {role === "ADMIN" && (
              <Link href="/admin" className="flex items-center gap-1.5 text-slate-300 hover:text-violet-300">
                <Shield className="h-4 w-4 text-violet-400" />
                Admin
              </Link>
            )}
          </nav>

          <div className="ml-auto flex shrink-0 items-center sm:ml-0">
            <WalletDropdown />
          </div>
        </Container>
      </header>
      <div
        className={
          fixedViewport
            ? "flex min-h-0 flex-1 flex-col overflow-hidden"
            : "flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
        }
      >
        {children}
      </div>
    </div>
  );
}
