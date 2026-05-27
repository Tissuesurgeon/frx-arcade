"use client";

import { useQuery } from "@tanstack/react-query";
import { GameShell } from "@/components/game/GameShell";
import { Container } from "@/components/Container";
import { apiFetch } from "@/lib/api";
import { useSessionStore } from "@/lib/stores/session";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminPage() {
  const { token, role } = useSessionStore();
  const router = useRouter();

  useEffect(() => {
    if (role !== "ADMIN") router.replace("/dashboard");
  }, [role, router]);

  const { data } = useQuery({
    queryKey: ["admin-overview", token],
    queryFn: () =>
      apiFetch<{
        users: number;
        activeTournaments: number;
        openFlags: number;
        aiSignals: { id: string; severity: string; title: string; summary: string; createdAt: string }[];
        hookMetrics: unknown;
      }>("/api/admin/overview", { token: token ?? undefined }),
    enabled: !!token && role === "ADMIN",
  });

  return (
    <GameShell>
      <main className="flex-1 px-4 py-10">
        <Container>
          <h1 className="text-3xl font-bold text-white">Admin · FRX Arena Agent</h1>
          <p className="mt-2 text-slate-400">Liquidity analytics, AI decisions, moderation</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Users" value={data?.users} />
            <Stat label="Active Tournaments" value={data?.activeTournaments} />
            <Stat label="Open Flags" value={data?.openFlags} />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold text-white">AI Decision Log</h2>
            <div className="mt-4 space-y-3">
              {(data?.aiSignals ?? []).map((s) => (
                <div
                  key={s.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                      s.severity === "CRITICAL" ? "bg-red-500/20 text-red-300" :
                      s.severity === "WARN" ? "bg-amber-500/20 text-amber-300" :
                      "bg-cyan-500/20 text-cyan-300"
                    }`}>{s.severity}</span>
                    <span className="font-medium text-white">{s.title}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{s.summary}</p>
                </div>
              ))}
            </div>
          </section>
        </Container>
      </main>
    </GameShell>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums text-white">{value ?? "—"}</p>
    </div>
  );
}
