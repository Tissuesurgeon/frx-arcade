import { toHex, verifyMessage } from "viem";
import { reconnect } from "wagmi/actions";
import { getOkxEthereumProvider } from "./okx";
import { okxWalletConnector, wagmiConfig } from "./config";

function isUserRejected(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /user rejected|user denied|cancelled|canceled|4001/i.test(msg);
}

/** Prompt OKX connect — always uses eth_requestAccounts (first popup). */
export async function requestOkxAccounts(): Promise<`0x${string}`> {
  const provider = getOkxEthereumProvider();
  if (!provider) {
    throw new Error(
      "OKX Wallet extension not detected. Install it, unlock it, and refresh."
    );
  }

  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];

  const account = accounts[0];
  if (!account) {
    throw new Error("OKX Wallet returned no account. Unlock the extension and try again.");
  }

  return account as `0x${string}`;
}

/** Read authorized accounts without prompting (after connect). */
export async function readOkxAccounts(): Promise<`0x${string}` | undefined> {
  const provider = getOkxEthereumProvider();
  if (!provider) return undefined;
  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  return accounts[0] ? (accounts[0] as `0x${string}`) : undefined;
}

/** Best-effort wagmi sync for swaps/UI — not required for SIWE sign-in. */
export async function syncWagmiAfterOkxConnect(): Promise<void> {
  try {
    await reconnect(wagmiConfig, { connectors: [okxWalletConnector] });
  } catch {
    // wagmi sync is optional for auth
  }
}

/**
 * Request SIWE signature via OKX provider (second popup).
 * Tries common personal_sign parameter orders used by OKX / MetaMask.
 */
export async function signOkxPersonalMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  const provider = getOkxEthereumProvider();
  if (!provider) {
    throw new Error("OKX Wallet not found. Refresh the page and connect again.");
  }

  const hexMessage = toHex(message);
  const lower = account.toLowerCase() as `0x${string}`;

  const paramSets: [string, string][] = [
    [hexMessage, lower],
    [hexMessage, account],
    [lower, hexMessage],
    [account, hexMessage],
  ];

  let lastErr: unknown;
  const rawRequest = provider.request.bind(provider) as (args: {
    method: string;
    params: unknown;
  }) => Promise<unknown>;

  for (const params of paramSets) {
    try {
      const signature = (await rawRequest({
        method: "personal_sign",
        params,
      })) as string;

      if (typeof signature !== "string" || !signature.startsWith("0x")) continue;

      const valid = await verifyMessage({
        address: account,
        message,
        signature: signature as `0x${string}`,
      }).catch(() => false);

      if (valid) return signature as `0x${string}`;
    } catch (err) {
      lastErr = err;
      if (isUserRejected(err)) throw err;
    }
  }

  if (lastErr instanceof Error) throw lastErr;
  throw new Error(
    "OKX did not show a sign prompt. Click the OKX extension icon — the approval may be waiting there."
  );
}
