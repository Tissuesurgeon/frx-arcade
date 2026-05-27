import { usdPriceToE8 } from "@frx/shared";

const CACHE_TTL_MS = 60_000;

type PriceCache = {
  usd: number;
  priceE8: bigint;
  fetchedAt: number;
  source: string;
};

let cache: PriceCache | null = null;

async function fetchFromOkx(): Promise<number> {
  const res = await fetch(
    "https://www.okx.com/api/v5/market/ticker?instId=OKB-USDT",
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) throw new Error(`OKX ticker HTTP ${res.status}`);
  const json = (await res.json()) as {
    code?: string;
    data?: Array<{ last?: string }>;
  };
  if (json.code !== "0" || !json.data?.[0]?.last) {
    throw new Error("OKX ticker response invalid");
  }
  const price = Number(json.data[0].last);
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("OKX ticker price invalid");
  }
  return price;
}

async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=okb&vs_currencies=usd",
    { signal: AbortSignal.timeout(8_000) }
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const json = (await res.json()) as { okb?: { usd?: number } };
  const price = json.okb?.usd;
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) {
    throw new Error("CoinGecko OKB price invalid");
  }
  return price;
}

export async function getOkbUsdPrice(forceRefresh = false): Promise<PriceCache> {
  if (
    !forceRefresh &&
    cache &&
    Date.now() - cache.fetchedAt < CACHE_TTL_MS
  ) {
    return cache;
  }

  const errors: string[] = [];
  for (const [source, fetcher] of [
    ["okx", fetchFromOkx],
    ["coingecko", fetchFromCoinGecko],
  ] as const) {
    try {
      const usd = await fetcher();
      cache = {
        usd,
        priceE8: usdPriceToE8(usd),
        fetchedAt: Date.now(),
        source,
      };
      return cache;
    } catch (err) {
      errors.push(
        `${source}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  if (cache) {
    console.warn("[okb-price] using stale cache:", errors.join("; "));
    return cache;
  }

  throw new Error(`Failed to fetch OKB/USD price (${errors.join("; ")})`);
}
