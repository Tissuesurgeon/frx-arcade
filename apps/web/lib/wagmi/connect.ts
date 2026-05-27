import type { Connector, CreateConnectorFn } from "wagmi";
import { ConnectorAlreadyConnectedError } from "wagmi";
import { connect, getAccount, reconnect } from "wagmi/actions";
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

/** Ensure wagmi has an active connector session (not just eth_accounts). */
export async function syncWalletConnection(): Promise<`0x${string}` | undefined> {
  try {
    await reconnect(wagmiConfig);
  } catch {
    // fall through
  }

  const account = getAccount(wagmiConfig);
  if (account.isConnected && account.address) return account.address;

  const provider = getOkxEthereumProvider();
  if (!provider) return undefined;

  const accounts = (await provider.request({
    method: "eth_accounts",
  })) as string[];
  const addr = accounts[0];
  if (!addr) return undefined;

  // eth_accounts alone is not enough for signing — reconnect wagmi to the connector.
  try {
    await reconnect(wagmiConfig);
  } catch {
    // fall through
  }

  const after = getAccount(wagmiConfig);
  if (after.isConnected && after.address) return after.address;

  return addr as `0x${string}`;
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
  const live = getAccount(wagmiConfig);
  if (live.isConnected && live.address) {
    await ensureXLayer(options.switchChainAsync);
    return live.address;
  }

  if (options.address) {
    const synced = getAccount(wagmiConfig);
    if (synced.isConnected && synced.address) {
      await ensureXLayer(options.switchChainAsync);
      return synced.address;
    }
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

    const account = getAccount(wagmiConfig);
    if (!account.isConnected) {
      try {
        await connect(wagmiConfig, {
          connector: options.connector,
          chainId: xLayer.id,
        });
      } catch (connectErr) {
        if (!isConnectorAlreadyConnectedError(connectErr)) throw connectErr;
      }
    }

    await ensureXLayer(options.switchChainAsync);
    return getAccount(wagmiConfig).address ?? address;
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
