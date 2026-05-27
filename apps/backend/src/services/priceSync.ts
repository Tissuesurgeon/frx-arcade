import {
  createWalletClient,
  http,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createXLayerPublicClient,
  xLayerTestnetChain,
  XLAYER_TESTNET_RPC_URLS,
} from "../lib/xlayerRpc";
import { getOkbUsdPrice } from "./okbPrice";

const routerAbi = [
  {
    type: "function",
    name: "okbUsdPriceE8",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "setOkbUsdPrice",
    inputs: [{ name: "priceE8", type: "uint256" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

function getRouterAddress(): Hex | null {
  const addr =
    process.env.SWAP_CREDIT_ROUTER_ADDRESS ??
    process.env.DEPOSIT_ROUTER_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr as Hex;
}

function getDeployerKey(): Hex | null {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) return null;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) return null;
  return hex as Hex;
}

/** Push live OKB/USD to SwapCreditRouter when it differs from on-chain price. */
export async function syncOkbPriceToRouter(): Promise<void> {
  const router = getRouterAddress();
  const pk = getDeployerKey();
  if (!router || !pk) return;

  const spot = await getOkbUsdPrice();
  const rpc = XLAYER_TESTNET_RPC_URLS[0] ?? "https://testrpc.xlayer.tech/terigon";
  const publicClient = createXLayerPublicClient();

  let onChainE8 = 0n;
  try {
    onChainE8 = await publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "okbUsdPriceE8",
    });
  } catch {
    // Legacy router without price oracle — skip silently.
    return;
  }

  if (onChainE8 === spot.priceE8) return;

  const account = privateKeyToAccount(pk);
  const walletClient = createWalletClient({
    account,
    chain: xLayerTestnetChain,
    transport: http(rpc),
  });

  const hash = await walletClient.writeContract({
    address: router,
    abi: routerAbi,
    functionName: "setOkbUsdPrice",
    args: [spot.priceE8],
  });

  console.log(
    `[price-sync] OKB $${spot.usd.toFixed(4)} (${spot.source}) → router ${hash}`
  );
}

export async function readOnChainOkbPriceE8(): Promise<bigint | null> {
  const router = getRouterAddress();
  if (!router) return null;

  const publicClient = createXLayerPublicClient();

  try {
    return await publicClient.readContract({
      address: router,
      abi: routerAbi,
      functionName: "okbUsdPriceE8",
    });
  } catch {
    return null;
  }
}
