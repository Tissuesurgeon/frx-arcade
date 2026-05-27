import { createThrottledLogger, createXLayerPublicClient } from "../lib/xlayerRpc";
import {
  decodeEventLog,
  type Hex,
} from "viem";
import { prisma } from "../lib/prisma";

const hookAbi = [
  {
    type: "event",
    name: "SwapRouted",
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "toTreasury", type: "uint256", indexed: false },
      { name: "toJackpot", type: "uint256", indexed: false },
      { name: "toEcosystem", type: "uint256", indexed: false },
    ],
  },
] as const;

function getHookAddress(): `0x${string}` | null {
  const addr = process.env.FRX_ARCADE_HOOK_ADDRESS;
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr as `0x${string}`;
}

const INDEX_INTERVAL_MS = 30_000;
/** X Layer testnet RPC rejects eth_getLogs spans > 100 blocks. */
const MAX_LOG_BLOCK_SPAN = 99n;
let lastIndexedBlock = 0n;

const logPollError = createThrottledLogger("hook-indexer");

async function fetchSwapRoutedLogs(
  client: ReturnType<typeof createXLayerPublicClient>,
  hook: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint
) {
  const logs: Awaited<ReturnType<typeof client.getLogs>> = [];

  for (let start = fromBlock; start <= toBlock; start += MAX_LOG_BLOCK_SPAN + 1n) {
    const end =
      start + MAX_LOG_BLOCK_SPAN > toBlock ? toBlock : start + MAX_LOG_BLOCK_SPAN;
    const chunk = await client.getLogs({
      address: hook,
      event: hookAbi[0],
      fromBlock: start,
      toBlock: end,
    });
    logs.push(...chunk);
  }

  return logs;
}

async function indexHookEvents(fromBlock: bigint, toBlock: bigint) {
  const hook = getHookAddress();
  if (!hook) return;

  const client = createXLayerPublicClient();
  const logs = await fetchSwapRoutedLogs(client, hook, fromBlock, toBlock);

  if (logs.length === 0) return;

  let totalSwaps = 0;
  let treasuryWei = 0n;
  let jackpotWei = 0n;
  let ecosystemWei = 0n;

  for (const log of logs) {
    const decoded = decodeEventLog({
      abi: hookAbi,
      data: log.data,
      topics: log.topics as [Hex, ...Hex[]] | [],
    });
    if (decoded.eventName !== "SwapRouted") continue;

    totalSwaps += 1;
    treasuryWei += decoded.args.toTreasury as bigint;
    jackpotWei += decoded.args.toJackpot as bigint;
    ecosystemWei += decoded.args.toEcosystem as bigint;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existing = await prisma.hookMetricsDaily.findUnique({
    where: { date: today },
  });

  const prevTreasury = BigInt(existing?.treasuryInflowWei ?? "0");
  const prevJackpot = BigInt(existing?.jackpotVolumeWei ?? "0");
  const prevEcosystem = BigInt(existing?.ecosystemVolumeWei ?? "0");

  await prisma.hookMetricsDaily.upsert({
    where: { date: today },
    create: {
      date: today,
      totalSwaps,
      treasuryInflowWei: treasuryWei.toString(),
      jackpotVolumeWei: jackpotWei.toString(),
      tournamentFundingWei: treasuryWei.toString(),
      ecosystemVolumeWei: ecosystemWei.toString(),
      liquidityScore: Math.min(1, totalSwaps / 100),
    },
    update: {
      totalSwaps: (existing?.totalSwaps ?? 0) + totalSwaps,
      treasuryInflowWei: (prevTreasury + treasuryWei).toString(),
      jackpotVolumeWei: (prevJackpot + jackpotWei).toString(),
      tournamentFundingWei: (prevTreasury + treasuryWei).toString(),
      ecosystemVolumeWei: (prevEcosystem + ecosystemWei).toString(),
      liquidityScore: Math.min(1, ((existing?.totalSwaps ?? 0) + totalSwaps) / 100),
    },
  });
}

async function pollOnce() {
  const hook = getHookAddress();
  if (!hook) return;

  const client = createXLayerPublicClient();
  const latest = await client.getBlockNumber();
  const deployBlock = BigInt(process.env.HOOK_DEPLOY_BLOCK ?? "0");

  if (lastIndexedBlock === 0n) {
    lastIndexedBlock = deployBlock > 0n ? deployBlock - 1n : latest - 1n;
  }

  if (latest <= lastIndexedBlock) return;

  await indexHookEvents(lastIndexedBlock + 1n, latest);
  lastIndexedBlock = latest;
}

export function startHookIndexer() {
  const hook = getHookAddress();
  if (!hook) {
    console.log("[hook-indexer] FRX_ARCADE_HOOK_ADDRESS not set — skipping");
    return;
  }

  console.log("[hook-indexer] polling SwapRouted events on", hook);

  void pollOnce().catch(logPollError);

  setInterval(() => {
    void pollOnce().catch(logPollError);
  }, INDEX_INTERVAL_MS);
}
