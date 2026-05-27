"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionState = {
  token: string | null;
  wallet: string | null;
  creditBalance: number;
  role: "PLAYER" | "ADMIN";
  setSession: (data: {
    token: string;
    wallet: string;
    creditBalance: number;
    role: "PLAYER" | "ADMIN";
  }) => void;
  setCreditBalance: (balance: number) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      wallet: null,
      creditBalance: 0,
      role: "PLAYER",
      setSession: (data) => set(data),
      setCreditBalance: (creditBalance) => set({ creditBalance }),
      clearSession: () =>
        set({ token: null, wallet: null, creditBalance: 0, role: "PLAYER" }),
    }),
    { name: "frx-session" }
  )
);

type UIState = {
  connectOpen: boolean;
  depositOpen: boolean;
  withdrawOpen: boolean;
  setConnectOpen: (v: boolean) => void;
  setDepositOpen: (v: boolean) => void;
  setWithdrawOpen: (v: boolean) => void;
};

export const useUIStore = create<UIState>((set) => ({
  connectOpen: false,
  depositOpen: false,
  withdrawOpen: false,
  setConnectOpen: (connectOpen) => set({ connectOpen }),
  setDepositOpen: (depositOpen) => set({ depositOpen }),
  setWithdrawOpen: (withdrawOpen) => set({ withdrawOpen }),
}));
