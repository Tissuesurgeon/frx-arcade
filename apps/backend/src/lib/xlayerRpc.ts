import {
  createPublicClient,
  fallback,
  http,
  type PublicClient,
} from "viem";
import { XLAYER_CHAIN_ID } from "@frx/shared";

/** Official + fallback endpoints — see OKX X Layer RPC docs. */
export const XLAYER_TESTNET_RPC_URLS = [
  process.env.XLAYER_RPC_URL,
  "https://testrpc.xlayer.tech/terigon",
  "https://xlayertestrpc.okx.com/terigon",
  "https://testrpc.xlayer.tech",
  "https://xlayertestrpc.okx.com",
].filter((url, i, arr): url is string => !!url && arr.indexOf(url) === i);

export const xLayerTestnetChain = {
  id: XLAYER_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: XLAYER_TESTNET_RPC_URLS,
    },
  },
} as const;

const RPC_TIMEOUT_MS = 20_000;

export function createXLayerPublicClient(): PublicClient {
  const urls =
    XLAYER_TESTNET_RPC_URLS.length > 0
      ? XLAYER_TESTNET_RPC_URLS
      : ["https://testrpc.xlayer.tech/terigon"];

  return createPublicClient({
    chain: xLayerTestnetChain,
    transport: fallback(
      urls.map((url) =>
        http(url, {
          timeout: RPC_TIMEOUT_MS,
          retryCount: 1,
          retryDelay: 500,
        })
      ),
      { rank: false }
    ),
  });
}

/** Log RPC errors at most once per interval (ms). */
export function createThrottledLogger(
  tag: string,
  intervalMs = 5 * 60_000
): (err: unknown) => void {
  let lastLogged = 0;
  return (err: unknown) => {
    const now = Date.now();
    if (now - lastLogged < intervalMs) return;
    lastLogged = now;
    const message =
      err instanceof Error ? err.message.split("\n")[0] : String(err);
    console.warn(
      `[${tag}] X Layer RPC unavailable (${XLAYER_TESTNET_RPC_URLS[0] ?? "default"} + fallbacks) — ${message}`
    );
  };
}
