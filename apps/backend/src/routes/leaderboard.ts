import { Router } from "express";
import { prisma } from "../lib/prisma";

export const leaderboardRouter = Router();

leaderboardRouter.get("/global", async (_req, res) => {
  const participants = await prisma.tournamentParticipant.findMany({
    where: { rewardCredits: { gt: 0 } },
    orderBy: [{ rewardCredits: "desc" }, { totalScore: "desc" }],
    take: 50,
    include: { user: true, tournament: true },
  });

  const entries = participants.map((p, i) => ({
    rank: i + 1,
    wallet: p.user.wallet,
    displayName: p.user.displayName,
    score: p.totalScore,
    rewardCredits: p.rewardCredits,
    tournamentId: p.tournamentId,
    tournamentTitle: p.tournament.title,
  }));

  res.json({ entries });
});

leaderboardRouter.get("/tournament/:id", async (req, res) => {
  const tournament = await prisma.tournament.findUnique({
    where: { id: req.params.id },
  });
  if (!tournament) {
    res.status(404).json({ error: "Tournament not found" });
    return;
  }

  const participants = await prisma.tournamentParticipant.findMany({
    where: { tournamentId: req.params.id },
    orderBy: [{ totalScore: "desc" }, { joinedAt: "asc" }],
    take: 100,
    include: { user: true },
  });

  const entries = participants.map((p, i) => ({
    rank: p.rank ?? i + 1,
    wallet: p.user.wallet,
    displayName: p.user.displayName,
    score: p.totalScore,
    rewardCredits: p.rewardCredits,
    tournamentId: p.tournamentId,
    attemptsUsed: p.attemptsUsed,
    completed: p.completedAt != null,
  }));

  res.json({
    tournament: {
      id: tournament.id,
      title: tournament.title,
      type: tournament.type,
      status: tournament.status,
      playerCount: tournament.playerCount,
      maxPlayers: tournament.maxPlayers,
    },
    entries,
  });
});
