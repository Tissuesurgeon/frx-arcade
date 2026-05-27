"use client";

import { createConfig, createStorage, fallback, http, noopStorage } from "wagmi";
import { injected } from "wagmi/connectors";
import { defineChain } from "viem";
import { XLAYER_CHAIN_ID } from "@frx/shared";
import { getOkxEthereumProvider } from "./okx";

const XLAYER_RPC_URLS = [
  process.env.NEXT_PUBLIC_XLAYER_RPC_URL,
  "https://testrpc.xlayer.tech/terigon",
  "https://xlayertestrpc.okx.com/terigon",
  "https://testrpc.xlayer.tech",
  "https://xlayertestrpc.okx.com",
].filter((url, i, arr): url is string => !!url && arr.indexOf(url) === i);

export const xLayer = defineChain({
  id: XLAYER_CHAIN_ID,
  name: "X Layer Testnet",
  nativeCurrency: { name: "OKB", symbol: "OKB", decimals: 18 },
  rpcUrls: {
    default: {
      http: XLAYER_RPC_URLS.length > 0 ? XLAYER_RPC_URLS : ["https://testrpc.xlayer.tech/terigon"],
    },
  },
  blockExplorers: {
    default: { name: "OKLink", url: "https://www.oklink.com/xlayer-test" },
  },
});

export const OKX_WALLET_CONNECTOR_ID = "okxWallet";

export const okxWalletConnector = injected({
  target() {
    const provider = getOkxEthereumProvider();
    if (!provider) return undefined;
    return {
      id: OKX_WALLET_CONNECTOR_ID,
      name: "OKX Wallet",
      provider,
    };
  },
  shimDisconnect: false,
  unstable_shimAsyncInject: 3_000,
});

export const wagmiConfig = createConfig({
  chains: [xLayer],
  connectors: [okxWalletConnector],
  storage: createStorage({
    storage: typeof window !== "undefined" ? localStorage : noopStorage,
  }),
  transports: {
    [xLayer.id]: fallback(
      (XLAYER_RPC_URLS.length > 0 ? XLAYER_RPC_URLS : ["https://testrpc.xlayer.tech/terigon"]).map(
        (url) => http(url, { timeout: 20_000, retryCount: 1 })
      )
    ),
  },
  ssr: true,
});
