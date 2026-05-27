import { prisma } from "./prisma";

const MAX_ATTEMPTS = 8;
const BASE_DELAY_MS = 2_000;

/** Wait for Postgres (e.g. Render waking from sleep) before workers query the DB. */
export async function connectDatabase(): Promise<void> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      console.log("[frx-backend] database connected");
      return;
    } catch (err) {
      const delay = BASE_DELAY_MS * attempt;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[frx-backend] database connect attempt ${attempt}/${MAX_ATTEMPTS} failed: ${message}`
      );
      if (attempt === MAX_ATTEMPTS) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
