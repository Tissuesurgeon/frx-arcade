import Redis from "ioredis";

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (!redis) {
    redis = new Redis(url, { maxRetriesPerRequest: 3, lazyConnect: true });
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client && client.status !== "ready") {
    await client.connect().catch(() => {
      console.warn("[redis] unavailable — rate limits fall back to memory");
    });
  }
}
