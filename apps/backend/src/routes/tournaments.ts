import { Router } from "express";
import {
  tournamentJoinSchema,
  MAX_ATTEMPTS_PER_TOURNAMENT,
  WEEKLY_QUALIFICATION_DAILY_COMPLETIONS,
} from "@frx/shared";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import {
  applyDailyEntrySplit,
  getActiveWeeklyEpoch,
  getUserQualification,
  isWeeklyQualified,
  getWeeklyJackpotPoolCredits,
} from "../services/economy";

export const tournamentsRouter = Router();

function mapTournament(t: {
  id: string;
  slug: string;
  title: string;
  type: string;
  tier: string;
  status: string;
  entryFeeCredits: number;
  prizePoolCredits: number;
  rewardPoolCredits: number;
  playerCount: number;
  maxPlayers: number;
  startsAt: Date;
  endsAt: Date;
  jackpotMultiplier: number;
}) {
  return {
    id: t.id,
    slug: t.slug,
    title: t.title,
    type: t.type,
    tier: t.tier,
    status: t.status,
    entryFeeCredits: t.entryFeeCredits,
    prizePoolCredits: t.prizePoolCredits,
    rewardPoolCredits: t.rewardPoolCredits,
    playerCount: t.playerCount,
    maxPlayers: t.maxPlayers,
    startsAt: t.startsAt.toISOString(),
    endsAt: t.endsAt.toISOString(),
    jackpotMultiplier: t.jackpotMultiplier,
  };
}

function mapParticipantStatus(
  participant: {
    id: string;
    attemptsUsed: number;
    completedAt: Date | null;
    totalScore: number;
    rank: number | null;
    rewardCredits: number;
    runAttempts: { attemptIndex: number; matches: number }[];
  } | null
) {
  if (!participant) {
    return {
      enrolled: false,
      attemptsUsed: 0,
      completed: false,
      attemptScores: [0, 0, 0] as [number, number, number],
      totalScore: 0,
      rank: null,
      rewardCredits: 0,
    };
  }

  const attemptScores: [number, number, number] = [0, 0, 0];
  for (const a of participant.runAttempts) {
    if (a.attemptIndex >= 1 && a.attemptIndex <= MAX_ATTEMPTS_PER_TOURNAMENT) {
      attemptScores[a.attemptIndex - 1] = a.matches;
    }
  }

  const completed =
    participant.completedAt != null ||
    participant.attemptsUsed >= MAX_ATTEMPTS_PER_TOURNAMENT;

  return {
    enrolled: true,
    participantId: participant.id,
    attemptsUsed: participant.attemptsUsed,
    completed,
    attemptScores,
    totalScore: participant.totalScore,
    rank: participant.rank,
    rewardCredits: participant.rewardCredits,
  };
}

tournamentsRouter.get("/", async (req, res) => {
  const type = typeof req.query.type === "string" ? req.query.type : undefined;
  const includeSettled =
    req.query.includeSettled === "1" || req.query.includeSettled === "true";
  const where: Record<string, unknown> = {
    status: {
      in: includeSettled
        ? ["OPEN", "LIVE", "CLOSED", "SETTLED"]
        : ["OPEN", "LIVE", "CLOSED"],
    },
    type: { in: ["DAILY", "WEEKLY_JACKPOT", "PRACTICE"] },
  };
  if (type === "DAILY") where.type = "DAILY";
  if (type === "WEEKLY_JACKPOT") where.type = "WEEKLY_JACKPOT";

  const tournaments = await prisma.tournament.findMany({
    where,
    orderBy: { startsAt: "desc" },
    take: 30,
  });
  res.json({ tournaments: tournaments.map(mapTournament) });
});

tournamentsRouter.get(
  "/qualification/me",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const epoch = await getActiveWeeklyEpoch();
    const qual = await getUserQualification(req.user!.sub, epoch.id);
    const bestDaily = await prisma.tournamentParticipant.findFirst({
      where: {
        userId: req.user!.sub,
        tournament: { type: "DAILY", status: "SETTLED" },
      },
      orderBy: { totalScore: "desc" },
    });

    res.json({
      weeklyEpochId: epoch.id,
      dailyCompletions: qual.dailyCompletions,
      requiredDailyCompletions: WEEKLY_QUALIFICATION_DAILY_COMPLETIONS,
      qualified:
        qual.qualifiedAt != null ||
        isWeeklyQualified(qual.dailyCompletions, bestDaily?.totalScore ?? 0),
      weeklyJackpotCredits: getWeeklyJackpotPoolCredits(epoch),
    });
  }
);

tournamentsRouter.get(
  "/participations/me",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const participations = await prisma.tournamentParticipant.findMany({
      where: { userId: req.user!.sub },
      include: { runAttempts: { orderBy: { attemptIndex: "asc" } } },
    });

    res.json({
      participations: participations.map((p) => ({
        tournamentId: p.tournamentId,
        ...mapParticipantStatus(p),
      })),
    });
  }
);

tournamentsRouter.get(
  "/:id/participant/me",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const tournamentId = String(req.params.id);
    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_userId: {
          tournamentId,
          userId: req.user!.sub,
        },
      },
      include: {
        runAttempts: { orderBy: { attemptIndex: "asc" } },
      },
    });

    res.json(mapParticipantStatus(participant));
  }
);

tournamentsRouter.get("/:id", async (req, res) => {
  const t = await prisma.tournament.findUnique({
    where: { id: req.params.id },
  });
  if (!t) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(mapTournament(t));
});

tournamentsRouter.post("/join", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = tournamentJoinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const tournament = await prisma.tournament.findUnique({
    where: { id: parsed.data.tournamentId },
  });

  if (!tournament || !["OPEN", "LIVE"].includes(tournament.status)) {
    res.status(400).json({ error: "Tournament not joinable" });
    return;
  }

  if (tournament.playerCount >= tournament.maxPlayers) {
    res.status(400).json({ error: "Tournament full" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (
    tournament.type !== "PRACTICE" &&
    user.creditBalance < tournament.entryFeeCredits
  ) {
    res.status(400).json({ error: "Insufficient FRX Credits" });
    return;
  }

  if (tournament.type === "WEEKLY_JACKPOT") {
    const epoch = await getActiveWeeklyEpoch();
    const qual = await getUserQualification(user.id, epoch.id);
    const bestDaily = await prisma.tournamentParticipant.findFirst({
      where: {
        userId: user.id,
        tournament: { type: "DAILY", status: "SETTLED" },
      },
      orderBy: { totalScore: "desc" },
    });
    if (
      qual.qualifiedAt == null &&
      !isWeeklyQualified(qual.dailyCompletions, bestDaily?.totalScore ?? 0)
    ) {
      res.status(403).json({
        error: `Complete ${WEEKLY_QUALIFICATION_DAILY_COMPLETIONS} daily tournaments to qualify`,
        dailyCompletions: qual.dailyCompletions,
      });
      return;
    }
  }

  const existing = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: tournament.id,
        userId: user.id,
      },
    },
  });

  if (existing) {
    const completed =
      existing.completedAt != null ||
      existing.attemptsUsed >= MAX_ATTEMPTS_PER_TOURNAMENT;
    if (completed) {
      res.status(409).json({ error: "Pool already completed" });
      return;
    }
    res.json({
      participantId: existing.id,
      alreadyJoined: true,
      attemptsUsed: existing.attemptsUsed,
      creditBalance: user.creditBalance,
    });
    return;
  }

  let poolClosed = false;
  let creditBalanceAfter = user.creditBalance;

  try {
    const result = await prisma.$transaction(async (tx) => {
      if (tournament.type !== "PRACTICE" && tournament.entryFeeCredits > 0) {
        const debited = await tx.user.updateMany({
          where: {
            id: user.id,
            creditBalance: { gte: tournament.entryFeeCredits },
          },
          data: { creditBalance: { decrement: tournament.entryFeeCredits } },
        });
        if (debited.count === 0) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        const updated = await tx.user.findUnique({ where: { id: user.id } });
        creditBalanceAfter = updated!.creditBalance;
        await tx.creditLedgerEntry.create({
          data: {
            userId: user.id,
            type: "ENTRY_FEE",
            amount: -tournament.entryFeeCredits,
            balanceAfter: creditBalanceAfter,
            metadata: { tournamentId: tournament.id, type: tournament.type },
          },
        });

        if (tournament.type === "DAILY") {
          const epochId =
            tournament.weeklyEpochId ?? (await getActiveWeeklyEpoch()).id;
          await applyDailyEntrySplit(
            tx,
            tournament.id,
            epochId,
            tournament.entryFeeCredits
          );
        } else if (tournament.type === "WEEKLY_JACKPOT") {
          await tx.tournament.update({
            where: { id: tournament.id },
            data: {
              rewardPoolCredits: { increment: tournament.entryFeeCredits },
              prizePoolCredits: { increment: tournament.entryFeeCredits },
            },
          });
        } else {
          await tx.tournament.update({
            where: { id: tournament.id },
            data: {
              prizePoolCredits: { increment: tournament.entryFeeCredits },
            },
          });
        }
      }

      const updatedTournament = await tx.tournament.update({
        where: { id: tournament.id },
        data: { playerCount: { increment: 1 } },
      });

      if (
        tournament.type === "DAILY" &&
        updatedTournament.playerCount >= updatedTournament.maxPlayers
      ) {
        await tx.tournament.update({
          where: { id: tournament.id },
          data: { status: "CLOSED" },
        });
        poolClosed = true;
      }

      return tx.tournamentParticipant.create({
        data: {
          tournamentId: tournament.id,
          userId: user.id,
        },
      });
    });

    res.json({
      participantId: result.id,
      alreadyJoined: false,
      attemptsUsed: 0,
      poolClosed,
      creditBalance: creditBalanceAfter,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      res.status(400).json({ error: "Insufficient FRX Credits" });
      return;
    }
    throw err;
  }
});
