import Redis from "ioredis";

let redis: Redis | null = null;
let redisAvailable = false;

function resolveRedisUrl(): string | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const isLocalhost =
    /(?:^|\/\/)(?:localhost|127\.0\.0\.1)(?::|\/|$)/i.test(url);
  if (isLocalhost && process.env.NODE_ENV !== "development") {
    console.warn(
      "[redis] ignoring localhost REDIS_URL — using in-memory rate limits"
    );
    return null;
  }

  return url;
}

export function isRedisAvailable(): boolean {
  return redisAvailable && redis !== null;
}

export function getRedis(): Redis | null {
  return isRedisAvailable() ? redis : null;
}

export async function connectRedis(): Promise<void> {
  const url = resolveRedisUrl();
  if (!url) return;

  const client = new Redis(url, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    enableOfflineQueue: false,
    connectTimeout: 10_000,
  });

  client.on("error", (err) => {
    console.warn("[redis]", err.message);
  });

  try {
    await client.connect();
    await client.ping();
    redis = client;
    redisAvailable = true;
    console.log("[redis] connected");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(
      `[redis] unavailable (${message}) — rate limits fall back to memory`
    );
    redisAvailable = false;
    redis = null;
    try {
      client.disconnect();
    } catch {
      // ignore cleanup errors
    }
  }
}
