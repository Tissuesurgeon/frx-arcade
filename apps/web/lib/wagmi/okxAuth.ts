import { toHex, type EIP1193Provider } from "viem";
import { getOkxWalletProvider } from "./okx";

function isUserRejected(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /user rejected|user denied|cancelled|canceled|4001/i.test(msg);
}

/** OKX allows only one in-flight wallet request — serialize all RPC calls. */
let walletRequestChain: Promise<unknown> = Promise.resolve();

function withWalletLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = walletRequestChain.then(fn, fn);
  walletRequestChain = next.then(
    () => undefined,
    () => undefined
  );
  return next;
}

function getProvider(): EIP1193Provider {
  const provider = getOkxWalletProvider();
  if (!provider) {
    throw new Error(
      "OKX Wallet extension not detected. Install it, unlock it, and refresh."
    );
  }
  return provider;
}

/** Prompt OKX connect — always uses eth_requestAccounts (first popup). */
export async function requestOkxAccounts(): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    const accounts = (await getProvider().request({
      method: "eth_requestAccounts",
    })) as string[];

    const account = accounts[0];
    if (!account) {
      throw new Error(
        "OKX Wallet returned no account. Unlock the extension and try again."
      );
    }

    return account as `0x${string}`;
  });
}

/** Read authorized accounts without prompting (after connect). */
export async function readOkxAccounts(): Promise<`0x${string}` | undefined> {
  const provider = getOkxWalletProvider();
  if (!provider) return undefined;

  return withWalletLock(async () => {
    const accounts = (await provider.request({
      method: "eth_accounts",
    })) as string[];
    return accounts[0] ? (accounts[0] as `0x${string}`) : undefined;
  });
}

/**
 * Request SIWE signature via OKX Provider API (second popup).
 *
 * OKX docs use plain UTF-8 message first: params: [message, account].
 * EIP-1193 wallets typically expect hex first — we try OKX format only here
 * (one request per click; multiple rapid personal_sign calls break OKX).
 */
export async function signOkxPersonalMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    const provider = getProvider();
    const lower = account.toLowerCase() as `0x${string}`;

    const rawRequest = provider.request.bind(provider) as (args: {
      method: string;
      params?: unknown;
    }) => Promise<unknown>;

    const requestSign = async (params: unknown[]) => {
      const signature = (await rawRequest({
        method: "personal_sign",
        params,
      })) as string;

      if (typeof signature !== "string" || !signature.startsWith("0x")) {
        throw new Error("OKX returned an invalid signature.");
      }
      return signature as `0x${string}`;
    };

    try {
      return await requestSign([message, lower]);
    } catch (plainErr) {
      if (isUserRejected(plainErr)) throw plainErr;

      const hexMessage = toHex(message);
      try {
        return await requestSign([hexMessage, lower]);
      } catch (hexErr) {
        if (isUserRejected(hexErr)) throw hexErr;
        if (hexErr instanceof Error) throw hexErr;
        if (plainErr instanceof Error) throw plainErr;
        throw new Error(
          "OKX did not show a sign prompt. Click the OKX extension icon — the approval may be waiting there."
        );
      }
    }
  });
}
