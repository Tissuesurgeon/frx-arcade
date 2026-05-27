import { Router } from "express";
import { scoreSubmitSchema, MAX_ATTEMPTS_PER_TOURNAMENT } from "@frx/shared";
import { verifyMessage } from "viem";
import { prisma } from "../lib/prisma";
import { requireAuth, type AuthedRequest } from "../middleware/auth";
import { scoreLimiter } from "../middleware/rateLimit";
import { validateScoreHeuristics } from "../services/antiCheat";
import { summarizeFlaggedScore } from "../workers/agent";

export const scoresRouter = Router();

scoresRouter.post("/submit", scoreLimiter, requireAuth, async (req: AuthedRequest, res) => {
  const parsed = scoreSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const nonceRecord = await prisma.scoreNonce.findUnique({
    where: { nonce: parsed.data.nonce },
  });

  if (
    !nonceRecord ||
    nonceRecord.used ||
    nonceRecord.wallet !== user.wallet ||
    nonceRecord.expiresAt < new Date()
  ) {
    res.status(400).json({ error: "Invalid or expired nonce" });
    return;
  }

  const payload = [
    parsed.data.tournamentId,
    parsed.data.attemptIndex,
    parsed.data.matches,
    parsed.data.durationMs,
    parsed.data.eventHash,
    parsed.data.nonce,
  ].join("|");

  let sigValid = false;
  try {
    sigValid = await verifyMessage({
      address: user.wallet as `0x${string}`,
      message: payload,
      signature: parsed.data.signature as `0x${string}`,
    });
  } catch {
    sigValid = false;
  }

  if (!sigValid) {
    res.status(401).json({ error: "Invalid score signature" });
    return;
  }

  const participant = await prisma.tournamentParticipant.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: parsed.data.tournamentId,
        userId: user.id,
      },
    },
  });

  if (!participant) {
    res.status(400).json({ error: "Not enrolled in tournament" });
    return;
  }

  if (
    participant.completedAt != null ||
    participant.attemptsUsed >= MAX_ATTEMPTS_PER_TOURNAMENT
  ) {
    res.status(409).json({ error: "Pool already completed" });
    return;
  }

  const heuristics = validateScoreHeuristics({
    matches: parsed.data.matches,
    durationMs: parsed.data.durationMs,
    attemptIndex: parsed.data.attemptIndex,
  });

  const attemptStatus = heuristics.flagged ? "FLAGGED" : "VALIDATED";

  await prisma.$transaction(async (tx) => {
    await tx.scoreNonce.update({
      where: { id: nonceRecord.id },
      data: { used: true },
    });

    await tx.runAttempt.upsert({
      where: {
        participantId_attemptIndex: {
          participantId: participant.id,
          attemptIndex: parsed.data.attemptIndex,
        },
      },
      create: {
        participantId: participant.id,
        userId: user.id,
        attemptIndex: parsed.data.attemptIndex,
        matches: parsed.data.matches,
        durationMs: parsed.data.durationMs,
        eventHash: parsed.data.eventHash,
        status: attemptStatus,
      },
      update: {
        matches: parsed.data.matches,
        durationMs: parsed.data.durationMs,
        eventHash: parsed.data.eventHash,
        status: attemptStatus,
      },
    });

    const attempts = await tx.runAttempt.findMany({
      where: { participantId: participant.id },
      orderBy: { attemptIndex: "asc" },
    });

    const scores = [0, 0, 0];
    for (const a of attempts) {
      if (a.attemptIndex >= 1 && a.attemptIndex <= MAX_ATTEMPTS_PER_TOURNAMENT) {
        scores[a.attemptIndex - 1] = a.matches;
      }
    }

    const totalScore = scores.reduce((s, n) => s + n, 0);
    const allSubmitted = attempts.length >= MAX_ATTEMPTS_PER_TOURNAMENT;
    const anyFlagged = attempts.some((a) => a.status === "FLAGGED");
    const aggregateStatus = anyFlagged
      ? "FLAGGED"
      : allSubmitted
        ? "VALIDATED"
        : "PENDING";

    await tx.submittedScore.upsert({
      where: {
        tournamentId_userId: {
          tournamentId: parsed.data.tournamentId,
          userId: user.id,
        },
      },
      create: {
        tournamentId: parsed.data.tournamentId,
        userId: user.id,
        totalScore,
        attempt1: scores[0]!,
        attempt2: scores[1]!,
        attempt3: scores[2]!,
        status: aggregateStatus,
      },
      update: {
        totalScore,
        attempt1: scores[0]!,
        attempt2: scores[1]!,
        attempt3: scores[2]!,
        status: aggregateStatus,
      },
    });

    await tx.tournamentParticipant.update({
      where: { id: participant.id },
      data: {
        totalScore,
        attemptsUsed: attempts.length,
        completedAt:
          attempts.length >= MAX_ATTEMPTS_PER_TOURNAMENT ? new Date() : null,
      },
    });

    if (heuristics.flagged) {
      await tx.moderationFlag.create({
        data: {
          userId: user.id,
          reason: heuristics.reason,
          metadata: heuristics.metadata as object,
        },
      });
    }
  });

  if (heuristics.flagged) {
    void summarizeFlaggedScore(user.wallet, heuristics.reason, parsed.data.matches);
  }

  const aggregate = await prisma.submittedScore.findUnique({
    where: {
      tournamentId_userId: {
        tournamentId: parsed.data.tournamentId,
        userId: user.id,
      },
    },
  });

  res.json({
    ok: true,
    attemptIndex: parsed.data.attemptIndex,
    totalScore: aggregate?.totalScore ?? parsed.data.matches,
    status: aggregate?.status ?? "PENDING",
    flagged: heuristics.flagged,
  });
});

scoresRouter.get("/nonce", requireAuth, async (req: AuthedRequest, res) => {
  const { randomUUID } = await import("crypto");
  const nonce = randomUUID();
  const expiresAt = new Date(Date.now() + 15 * 60_000);

  const user = await prisma.user.findUnique({ where: { id: req.user!.sub } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  await prisma.scoreNonce.create({
    data: { nonce, wallet: user.wallet, expiresAt },
  });

  res.json({ nonce, expiresAt: expiresAt.toISOString() });
});
