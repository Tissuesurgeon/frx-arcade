import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../lib/redis";

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  prefix: string;
}) {
  const redis = getRedis();
  return rateLimit({
    windowMs: opts.windowMs,
    max: opts.max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(redis
      ? {
          store: new RedisStore({
            sendCommand: (...args: string[]) =>
              redis.call(args[0], ...args.slice(1)) as Promise<number>,
            prefix: `rl:${opts.prefix}:`,
          }),
        }
      : {}),
  });
}

export const globalLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 120,
  prefix: "global",
});

export const authLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 20,
  prefix: "auth",
});

export const scoreLimiter = createRateLimiter({
  windowMs: 60_000,
  max: 30,
  prefix: "score",
});
