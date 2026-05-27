import { Router } from "express";
import { randomUUID } from "crypto";
import { authChallengeSchema, authVerifySchema } from "@frx/shared";
import {
  buildAuthMessage,
  findOrCreateUser,
  signToken,
  verifyWalletSignature,
  getAdminWallets,
} from "../lib/auth";
import { prisma } from "../lib/prisma";
import { authLimiter } from "../middleware/rateLimit";

export const authRouter = Router();

authRouter.post("/challenge", authLimiter, async (req, res) => {
  const parsed = authChallengeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const wallet = parsed.data.wallet.toLowerCase();
  const user = await findOrCreateUser(wallet);
  const nonce = randomUUID();
  const message = buildAuthMessage(wallet, nonce);
  const expiresAt = new Date(Date.now() + 10 * 60_000);

  await prisma.authNonce.create({
    data: { userId: user.id, nonce, message, expiresAt },
  });

  res.json({ message, nonce });
});

authRouter.post("/verify", authLimiter, async (req, res) => {
  const parsed = authVerifySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const wallet = parsed.data.wallet.toLowerCase();
  const record = await prisma.authNonce.findFirst({
    where: {
      nonce: parsed.data.message.match(/Nonce: (.+)/)?.[1],
      used: false,
      expiresAt: { gt: new Date() },
      user: { wallet },
    },
    include: { user: true },
  });

  if (!record || record.message !== parsed.data.message) {
    res.status(401).json({ error: "Invalid or expired challenge" });
    return;
  }

  const valid = await verifyWalletSignature(
    wallet,
    parsed.data.message,
    parsed.data.signature as `0x${string}`
  );

  if (!valid) {
    res.status(401).json({ error: "Signature verification failed" });
    return;
  }

  await prisma.authNonce.update({
    where: { id: record.id },
    data: { used: true },
  });

  const admins = getAdminWallets();
  const role = admins.has(wallet) ? "ADMIN" : record.user.role;

  const token = signToken({
    sub: record.user.id,
    wallet,
    role: role as "PLAYER" | "ADMIN",
  });

  res.cookie("frx_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    token,
    user: {
      id: record.user.id,
      wallet,
      displayName: record.user.displayName,
      creditBalance: record.user.creditBalance,
      role,
    },
  });
});

authRouter.post("/logout", (_req, res) => {
  res.clearCookie("frx_token");
  res.json({ ok: true });
});

authRouter.get("/me", async (req, res) => {
  const header = req.headers.authorization;
  const cookie = req.cookies?.frx_token as string | undefined;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : cookie;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { verifyToken } = await import("../lib/auth");
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    wallet: user.wallet,
    displayName: user.displayName,
    creditBalance: user.creditBalance,
    role: user.role,
  });
});
