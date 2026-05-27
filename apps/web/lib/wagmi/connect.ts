import type { Connector, CreateConnectorFn } from "wagmi";
import { ConnectorAlreadyConnectedError } from "wagmi";
import { getAccount, reconnect } from "wagmi/actions";
import { wagmiConfig, xLayer } from "./config";
import { getOkxEthereumProvider } from "./okx";

export function isConnectorAlreadyConnectedError(err: unknown): boolean {
  return (
    err instanceof ConnectorAlreadyConnectedError ||
    (err instanceof Error &&
      (err.name === "ConnectorAlreadyConnectedError" ||
        /connector already connected/i.test(err.message)))
  );
}

/** Sync wagmi React state when the extension is already connected. */
export async function syncWalletConnection(): Promise<`0x${string}` | undefined> {
  try {
    await reconnect(wagmiConfig);
  } catch {
    // reconnect may no-op if nothing persisted — fall through to provider read
  }

  const account = getAccount(wagmiConfig);
  if (account.address) return account.address;

  const provider = getOkxEthereumProvider();
  if (!provider) return undefined;

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const addr = accounts[0];
  return addr ? (addr as `0x${string}`) : undefined;
}

type ConnectAsync = (args: {
  connector: WagmiConnector;
  chainId: number;
}) => Promise<{ accounts: readonly `0x${string}`[]; chainId: number }>;

type SwitchChainAsync = (args: { chainId: number }) => Promise<unknown>;

type WagmiConnector = Connector | CreateConnectorFn;

export async function connectOkxWallet(options: {
  address?: `0x${string}`;
  connector: WagmiConnector;
  connectAsync: ConnectAsync;
  switchChainAsync: SwitchChainAsync;
}): Promise<`0x${string}`> {
  if (options.address) {
    await ensureXLayer(options.switchChainAsync);
    return options.address;
  }

  const synced = await syncWalletConnection();
  if (synced) {
    await ensureXLayer(options.switchChainAsync);
    return synced;
  }

  try {
    const result = await options.connectAsync({
      connector: options.connector,
      chainId: xLayer.id,
    });
    if (result.chainId !== xLayer.id) {
      await ensureXLayer(options.switchChainAsync);
    }
    return result.accounts[0]!;
  } catch (err) {
    if (!isConnectorAlreadyConnectedError(err)) throw err;

    const address = await syncWalletConnection();
    if (!address) {
      throw new Error(
        "OKX Wallet is connected but this site is not authorized. Open OKX, disconnect this site, then connect again."
      );
    }
    await ensureXLayer(options.switchChainAsync);
    return address;
  }
}

async function ensureXLayer(switchChainAsync: SwitchChainAsync): Promise<void> {
  const account = getAccount(wagmiConfig);
  if (account.chainId === xLayer.id) return;
  try {
    await switchChainAsync({ chainId: xLayer.id });
  } catch {
    // User may switch manually in OKX
  }
}
