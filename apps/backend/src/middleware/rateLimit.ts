import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedis } from "../lib/redis";

type LimiterOptions = {
  windowMs: number;
  max: number;
  prefix: string;
};

function createRateLimiter(opts: LimiterOptions): RateLimitRequestHandler {
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

export let globalLimiter!: RateLimitRequestHandler;
export let authLimiter!: RateLimitRequestHandler;
export let scoreLimiter!: RateLimitRequestHandler;

/** Call after connectRedis() so Redis-backed stores are used when available. */
export function initRateLimiters(): void {
  globalLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 120,
    prefix: "global",
  });
  authLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 20,
    prefix: "auth",
  });
  scoreLimiter = createRateLimiter({
    windowMs: 60_000,
    max: 30,
    prefix: "score",
  });
}

// Routes import these at module load — init with in-memory store first.
initRateLimiters();
