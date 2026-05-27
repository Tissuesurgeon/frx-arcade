import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";

export const adminRouter = Router();

adminRouter.use(requireAdmin);

adminRouter.get("/overview", async (_req, res) => {
  const [users, tournaments, flags, signals, hookMetrics] = await Promise.all([
    prisma.user.count(),
    prisma.tournament.count({ where: { status: { in: ["OPEN", "LIVE"] } } }),
    prisma.moderationFlag.count({ where: { resolved: false } }),
    prisma.aISignal.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.hookMetricsDaily.findFirst({ orderBy: { date: "desc" } }),
  ]);

  res.json({
    users,
    activeTournaments: tournaments,
    openFlags: flags,
    aiSignals: signals,
    hookMetrics,
  });
});

adminRouter.get("/flags", async (_req, res) => {
  const flags = await prisma.moderationFlag.findMany({
    where: { resolved: false },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  res.json({ flags });
});

adminRouter.post("/flags/:id/resolve", async (req, res) => {
  await prisma.moderationFlag.update({
    where: { id: req.params.id },
    data: { resolved: true },
  });
  res.json({ ok: true });
});

adminRouter.get("/ai-signals", async (_req, res) => {
  const signals = await prisma.aISignal.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json({ signals });
});

adminRouter.post("/tournaments", async (req, res) => {
  const { title, type, entryFeeCredits, prizePoolCredits, maxPlayers, hours } =
    req.body as {
      title: string;
      type: string;
      entryFeeCredits?: number;
      prizePoolCredits?: number;
      maxPlayers?: number;
      hours?: number;
    };

  const slug = title.toLowerCase().replace(/\s+/g, "-").slice(0, 48);
  const startsAt = new Date();
  const endsAt = new Date(Date.now() + (hours ?? 24) * 3600_000);

  const t = await prisma.tournament.create({
    data: {
      slug: `${slug}-${Date.now()}`,
      title,
      type: (type ?? "LIVE") as "LIVE" | "SCHEDULED" | "PRACTICE" | "JACKPOT",
      status: "OPEN",
      entryFeeCredits: entryFeeCredits ?? 10,
      prizePoolCredits: prizePoolCredits ?? 500,
      maxPlayers: maxPlayers ?? 200,
      startsAt,
      endsAt,
    },
  });

  res.json({ tournament: t });
});
