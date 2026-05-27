export const swapCreditRouterAbi = [
  {
    type: "function",
    name: "swapForCredits",
    inputs: [],
    outputs: [],
    stateMutability: "payable",
  },
  {
    type: "function",
    name: "okbUsdPriceE8",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "computeCredits",
    inputs: [{ name: "okbIn", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "CREDITS_PER_USD",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "event",
    name: "CreditsPurchased",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "okbIn", type: "uint256", indexed: false },
      { name: "creditsMinted", type: "uint256", indexed: false },
      { name: "poolId", type: "bytes32", indexed: true },
    ],
  },
] as const;


function parseAddress(addr: string | null | undefined): `0x${string}` | undefined {
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return undefined;
  return addr as `0x${string}`;
}

export function resolveSwapCreditRouterAddress(
  fallback?: string | null
): `0x${string}` | undefined {
  return (
    parseAddress(process.env.NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS) ??
    parseAddress(process.env.NEXT_PUBLIC_DEPOSIT_ROUTER_ADDRESS) ??
    parseAddress(fallback)
  );
}

export function getSwapCreditRouterAddress(): `0x${string}` | undefined {
  return resolveSwapCreditRouterAddress();
}

export function getFrxArcadeHookAddress(): `0x${string}` | undefined {
  const addr = process.env.NEXT_PUBLIC_FRX_ARCADE_HOOK_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return undefined;
  return addr as `0x${string}`;
}

export function getPoolManagerAddress(): `0x${string}` | undefined {
  const addr = process.env.NEXT_PUBLIC_POOL_MANAGER_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return undefined;
  return addr as `0x${string}`;
}

export const XLAYER_EXPLORER = "https://www.okx.com/web3/explorer/xlayer-test";

export function explorerAddressUrl(address: string): string {
  return `${XLAYER_EXPLORER}/address/${address}`;
}
