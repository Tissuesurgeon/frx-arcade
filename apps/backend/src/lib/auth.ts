import jwt from "jsonwebtoken";
import { verifyMessage } from "viem";
import { prisma } from "./prisma";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-me";
const JWT_EXPIRY = "7d";

export type JwtPayload = {
  sub: string;
  wallet: string;
  role: "PLAYER" | "ADMIN";
};

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function buildAuthMessage(wallet: string, nonce: string): string {
  return [
    "FRX Arcade wants you to sign in with your wallet.",
    "",
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    "",
    "This request will not trigger a blockchain transaction or cost any gas fees.",
  ].join("\n");
}

export async function verifyWalletSignature(
  wallet: string,
  message: string,
  signature: `0x${string}`
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature,
    });
    return valid;
  } catch {
    return false;
  }
}

export function getAdminWallets(): Set<string> {
  const raw = process.env.ADMIN_WALLETS ?? "";
  return new Set(
    raw
      .split(",")
      .map((w) => w.trim().toLowerCase())
      .filter(Boolean)
  );
}

export async function findOrCreateUser(wallet: string) {
  const normalized = wallet.toLowerCase();
  const admins = getAdminWallets();
  const role = admins.has(normalized) ? "ADMIN" : "PLAYER";

  return prisma.user.upsert({
    where: { wallet: normalized },
    create: { wallet: normalized, role, creditBalance: 0 },
    update: {},
  });
}
