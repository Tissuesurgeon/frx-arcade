import {
  createWalletClient,
  http,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createXLayerPublicClient,
  xLayerTestnetChain,
  XLAYER_TESTNET_RPC_URLS,
} from "../lib/xlayerRpc";

const treasuryVaultAbi = [
  {
    type: "function",
    name: "withdrawTo",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

function getRpcUrl(): string {
  return XLAYER_TESTNET_RPC_URLS[0] ?? "https://testrpc.xlayer.tech/terigon";
}

function getDeployerKey(): Hex | null {
  const raw = process.env.PRIVATE_KEY?.trim();
  if (!raw) return null;
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  if (!/^0x[a-fA-F0-9]{64}$/.test(hex)) return null;
  return hex as Hex;
}

function getTreasuryVaultAddress(): Hex | null {
  const addr = process.env.TREASURY_VAULT_ADDRESS?.trim();
  if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) return null;
  return addr as Hex;
}

export function isOkbPayoutConfigured(): boolean {
  return getDeployerKey() !== null;
}

export async function getPayoutWalletBalance(): Promise<bigint> {
  const pk = getDeployerKey();
  if (!pk) return 0n;

  const rpc = getRpcUrl();
  const account = privateKeyToAccount(pk);
  const publicClient = createXLayerPublicClient();

  const vault = getTreasuryVaultAddress();
  if (vault) {
    try {
      const vaultBalance = await publicClient.getBalance({ address: vault });
      if (vaultBalance > 0n) return vaultBalance;
    } catch {
      // Fall through to deployer balance.
    }
  }

  return publicClient.getBalance({ address: account.address });
}

/** Send testnet OKB to a player wallet at the inverse of the OKB→credits rate. */
export async function sendOkbPayout(
  to: `0x${string}`,
  okbWei: bigint
): Promise<Hash> {
  if (okbWei <= 0n) {
    throw new Error("OKB payout amount too small");
  }

  const pk = getDeployerKey();
  if (!pk) {
    throw new Error("Payout wallet not configured (set PRIVATE_KEY on backend)");
  }

  const rpc = getRpcUrl();
  const account = privateKeyToAccount(pk);
  const publicClient = createXLayerPublicClient();
  const walletClient = createWalletClient({
    account,
    chain: xLayerTestnetChain,
    transport: http(rpc),
  });

  const vault = getTreasuryVaultAddress();
  if (vault) {
    const vaultBalance = await publicClient.getBalance({ address: vault });
    if (vaultBalance >= okbWei) {
      return walletClient.writeContract({
        address: vault,
        abi: treasuryVaultAbi,
        functionName: "withdrawTo",
        args: [to, okbWei, "0x4352454449545f52454445454d000000000000000000000000000000000000" as Hex],
      });
    }
  }

  const deployerBalance = await publicClient.getBalance({
    address: account.address,
  });
  if (deployerBalance < okbWei) {
    throw new Error("Insufficient OKB in treasury wallet for redemption");
  }

  return walletClient.sendTransaction({
    to,
    value: okbWei,
  });
}
