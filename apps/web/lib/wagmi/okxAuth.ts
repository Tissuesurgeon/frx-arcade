import { type EIP1193Provider } from "viem";
import { XLAYER_CHAIN_ID } from "@frx/shared";
import { connect, disconnect, getAccount, signMessage } from "wagmi/actions";
import { okxWalletConnector, wagmiConfig, xLayer } from "./config";
import {
  clearActiveOkxProvider,
  clearWalletManuallyDisconnected,
  getActiveOkxProvider,
  getOkxProviderCandidates,
  isWalletManuallyDisconnected,
  markWalletManuallyDisconnected,
  setActiveOkxProvider,
} from "./okx";

function isConnectorAlreadyConnected(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /connector already connected/i.test(msg);
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

function rawRequest(
  provider: EIP1193Provider,
  args: { method: string; params?: unknown }
): Promise<unknown> {
  const request = provider.request.bind(provider) as (a: {
    method: string;
    params?: unknown;
  }) => Promise<unknown>;
  return request(args);
}

function clearWagmiPersistence(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith("wagmi")) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore storage errors
  }
}

async function requestOkxPermissions(
  provider: EIP1193Provider
): Promise<`0x${string}`> {
  try {
    const permitted = (await rawRequest(provider, {
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    })) as unknown;
    if (permitted) {
      const accounts = (await rawRequest(provider, {
        method: "eth_accounts",
      })) as string[];
      if (accounts[0]) return accounts[0] as `0x${string}`;
    }
  } catch {
    // fall through to eth_requestAccounts
  }

  const accounts = (await rawRequest(provider, {
    method: "eth_requestAccounts",
  })) as string[];

  const account = accounts[0];
  if (!account) {
    throw new Error(
      "OKX Wallet returned no account. Unlock the extension and try again."
    );
  }
  return account as `0x${string}`;
}

/** Prompt OKX connect — permission popup so a different account can be chosen. */
export async function requestOkxAccounts(): Promise<`0x${string}`> {
  clearWalletManuallyDisconnected();
  clearActiveOkxProvider();

  return withWalletLock(async () => {
    const candidates = getOkxProviderCandidates();
    if (candidates.length === 0) {
      throw new Error(
        "OKX Wallet extension not detected. Install it, unlock it, and refresh."
      );
    }

    let lastErr: unknown;
    for (const provider of candidates) {
      try {
        const account = await requestOkxPermissions(provider);
        setActiveOkxProvider(provider);
        return account;
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr instanceof Error) throw lastErr;
    throw new Error(
      "OKX Wallet returned no account. Unlock the extension and try again."
    );
  });
}

/** Read authorized accounts without prompting (skipped after manual disconnect). */
export async function readOkxAccounts(): Promise<`0x${string}` | undefined> {
  if (isWalletManuallyDisconnected()) return undefined;

  const provider = getActiveOkxProvider() ?? getOkxProviderCandidates()[0];
  if (!provider) return undefined;

  return withWalletLock(async () => {
    const accounts = (await rawRequest(provider, {
      method: "eth_accounts",
    })) as string[];
    return accounts[0] ? (accounts[0] as `0x${string}`) : undefined;
  });
}

async function revokeOkxSiteAccess(): Promise<void> {
  for (const provider of getOkxProviderCandidates()) {
    try {
      await rawRequest(provider, {
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }],
      });
    } catch {
      // OKX versions without EIP-2255 revoke — user can disconnect site in extension
    }
  }
}

/** Full disconnect: app state, wagmi persistence, OKX site permission, active provider. */
export async function disconnectOkxWallet(): Promise<void> {
  markWalletManuallyDisconnected();
  clearActiveOkxProvider();
  walletRequestChain = Promise.resolve();

  await revokeOkxSiteAccess().catch(() => {});

  try {
    disconnect(wagmiConfig);
  } catch {
    // wagmi may already be disconnected
  }

  clearWagmiPersistence();
}

/** Wagmi sync only AFTER sign-in — never during connect/sign (steals OKX popup slot). */
export async function syncWagmiAfterOkxConnect(): Promise<void> {
  if (isWalletManuallyDisconnected()) return;

  const live = getAccount(wagmiConfig);
  if (live.isConnected && live.address) return;

  try {
    await connect(wagmiConfig, {
      connector: okxWalletConnector,
      chainId: xLayer.id,
    });
  } catch (err) {
    if (!isConnectorAlreadyConnected(err)) return;
    try {
      await connect(wagmiConfig, {
        connector: okxWalletConnector,
        chainId: xLayer.id,
      });
    } catch {
      // swaps can still use sendOkxTransaction
    }
  }
}

const xLayerHex = `0x${XLAYER_CHAIN_ID.toString(16)}`;

export async function ensureOkxXLayerChain(): Promise<void> {
  return withWalletLock(async () => {
    const provider = getActiveOkxProvider() ?? getOkxProviderCandidates()[0];
    if (!provider) throw new Error("OKX Wallet not found.");

    const chainId = (await rawRequest(provider, {
      method: "eth_chainId",
    })) as string;
    if (chainId?.toLowerCase() === xLayerHex.toLowerCase()) return;

    try {
      await rawRequest(provider, {
        method: "wallet_switchEthereumChain",
        params: [{ chainId: xLayerHex }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/4902|unrecognized chain/i.test(msg)) throw err;

      await rawRequest(provider, {
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: xLayerHex,
            chainName: xLayer.name,
            nativeCurrency: xLayer.nativeCurrency,
            rpcUrls: xLayer.rpcUrls.default.http,
            blockExplorerUrls: [xLayer.blockExplorers.default.url],
          },
        ],
      });
    }
  });
}

export async function signOkxPersonalMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    const provider =
      getActiveOkxProvider() ?? getOkxProviderCandidates()[0];
    if (!provider) {
      throw new Error("OKX Wallet not found. Connect again, then sign in.");
    }

    const signature = (await rawRequest(provider, {
      method: "personal_sign",
      params: [message, account],
    })) as string;

    if (typeof signature === "string" && signature.startsWith("0x")) {
      return signature as `0x${string}`;
    }

    const wagmiAccount = getAccount(wagmiConfig);
    if (
      wagmiAccount.isConnected &&
      wagmiAccount.address?.toLowerCase() === account.toLowerCase()
    ) {
      return signMessage(wagmiConfig, { message, account });
    }

    throw new Error(
      "OKX did not show a sign prompt. After connecting, click “Approve sign-in message” (step 2). Also check the OKX extension icon for a pending approval."
    );
  });
}

export async function sendOkxTransaction(args: {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data?: `0x${string}`;
  gas?: bigint;
}): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    await ensureOkxXLayerChain();
    const provider =
      getActiveOkxProvider() ?? getOkxProviderCandidates()[0];
    if (!provider) throw new Error("OKX Wallet not found.");

    const hash = (await rawRequest(provider, {
      method: "eth_sendTransaction",
      params: [
        {
          from: args.from,
          to: args.to,
          value: `0x${args.value.toString(16)}`,
          data: args.data ?? "0x",
          gas: args.gas ? `0x${args.gas.toString(16)}` : undefined,
        },
      ],
    })) as string;

    if (typeof hash !== "string" || !hash.startsWith("0x")) {
      throw new Error("OKX did not return a transaction hash.");
    }
    return hash as `0x${string}`;
  });
}
