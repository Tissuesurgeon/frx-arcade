import { createPublicClient, fallback, http } from "viem";
import { xLayer } from "./config";

const RPC_URLS = [
  process.env.NEXT_PUBLIC_XLAYER_RPC_URL,
  "https://testrpc.xlayer.tech/terigon",
  "https://testrpc.xlayer.tech",
].filter((url, i, arr): url is string => !!url && arr.indexOf(url) === i);

export const xLayerPublicClient = createPublicClient({
  chain: xLayer,
  transport: fallback(
    (RPC_URLS.length > 0 ? RPC_URLS : ["https://testrpc.xlayer.tech/terigon"]).map(
      (url) => http(url, { timeout: 20_000, retryCount: 2 })
    )
  ),
});
