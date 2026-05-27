import { toHex, type EIP1193Provider } from "viem";
import { XLAYER_CHAIN_ID } from "@frx/shared";
import { connect, getAccount } from "wagmi/actions";
import { okxWalletConnector, wagmiConfig, xLayer } from "./config";
import { getOkxWalletProvider } from "./okx";

function isUserRejected(err: unknown): boolean {
  const msg =
    err instanceof Error ? err.message : typeof err === "string" ? err : "";
  return /user rejected|user denied|cancelled|canceled|4001/i.test(msg);
}

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

/** Best-effort wagmi session for swaps / chain reads — never call during personal_sign. */
export async function syncWagmiAfterOkxConnect(): Promise<void> {
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
      // direct OKX provider still works for auth + manual tx fallback
    }
  }
}

const xLayerHex = `0x${XLAYER_CHAIN_ID.toString(16)}`;

/** Switch OKX to X Layer testnet before on-chain actions (separate user gesture from sign-in). */
export async function ensureOkxXLayerChain(): Promise<void> {
  return withWalletLock(async () => {
    const provider = getProvider();
    const chainId = (await provider.request({ method: "eth_chainId" })) as string;
    if (chainId?.toLowerCase() === xLayerHex.toLowerCase()) return;

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: xLayerHex }],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (!/4902|unrecognized chain/i.test(msg)) throw err;

      await provider.request({
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

/**
 * Request SIWE signature via OKX Provider API (second popup).
 * OKX docs: params: [plainMessage, accountFromEthRequestAccounts]
 */
export async function signOkxPersonalMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    const provider = getProvider();

    const rawRequest = provider.request.bind(provider) as (args: {
      method: string;
      params?: unknown;
    }) => Promise<unknown>;

    const signature = (await rawRequest({
      method: "personal_sign",
      params: [message, account],
    })) as string;

    if (typeof signature === "string" && signature.startsWith("0x")) {
      return signature as `0x${string}`;
    }

    const hexMessage = toHex(message);
    const hexSignature = (await rawRequest({
      method: "personal_sign",
      params: [hexMessage, account],
    })) as string;

    if (typeof hexSignature !== "string" || !hexSignature.startsWith("0x")) {
      throw new Error(
        "OKX did not return a signature. Open the OKX extension — the approval may be waiting there."
      );
    }

    return hexSignature as `0x${string}`;
  });
}

/** Send a transaction through OKX when wagmi walletClient is unavailable. */
export async function sendOkxTransaction(args: {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
  data?: `0x${string}`;
  gas?: bigint;
}): Promise<`0x${string}`> {
  return withWalletLock(async () => {
    await ensureOkxXLayerChain();
    const provider = getProvider();
    const hash = (await provider.request({
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
