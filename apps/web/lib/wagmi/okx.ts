import type { EIP1193Provider } from "viem";

type OkxInjectedProvider = EIP1193Provider & {
  isOkxWallet?: boolean;
  isOKExWallet?: boolean;
};

type OkxWindow = Window & {
  okxwallet?: EIP1193Provider & {
    ethereum?: EIP1193Provider;
  };
  okexchain?: EIP1193Provider;
  ethereum?: OkxInjectedProvider & {
    providers?: OkxInjectedProvider[];
  };
};

function isEip1193(p: unknown): p is EIP1193Provider {
  return (
    typeof p === "object" &&
    p !== null &&
    "request" in p &&
    typeof (p as EIP1193Provider).request === "function"
  );
}

/**
 * OKX Provider API: use top-level `window.okxwallet` for EVM RPC (eth_requestAccounts, personal_sign).
 * @see https://github.com/gecyg601/okx-wallet-integration — params: ["message", "account"]
 */
export function getOkxWalletProvider(win?: Window): EIP1193Provider | undefined {
  const w = (win ?? (typeof window !== "undefined" ? window : undefined)) as
    | OkxWindow
    | undefined;
  if (!w) return undefined;

  if (isEip1193(w.okxwallet)) return w.okxwallet;

  const okxNested = w.okxwallet as OkxWindow["okxwallet"];
  if (okxNested && isEip1193(okxNested.ethereum)) return okxNested.ethereum;

  const eth = w.ethereum;
  if (eth?.providers?.length) {
    const okx = eth.providers.find(
      (p: OkxInjectedProvider) => p.isOkxWallet || p.isOKExWallet
    );
    if (isEip1193(okx)) return okx;
  }

  if (eth && (eth.isOkxWallet || eth.isOKExWallet) && isEip1193(eth)) {
    return eth;
  }

  if (isEip1193(w.okexchain)) return w.okexchain;

  return undefined;
}

/** @deprecated Use getOkxWalletProvider — kept for wagmi connector wiring. */
export function getOkxEthereumProvider(win?: Window): EIP1193Provider | undefined {
  return getOkxWalletProvider(win);
}

/** Extension script present (may still be locked / empty keyring). */
export function isOkxWalletInstalled(): boolean {
  return getOkxWalletProvider() !== undefined;
}

/** Human-readable errors for OKX / extension issues seen in the browser console. */
export function parseWalletConnectError(err: unknown): string {
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "";

  if (/key ring is empty/i.test(msg)) {
    return "OKX Wallet is installed but not set up or unlocked. Open the OKX extension, create or import a wallet, unlock it with your password, then try Connect again.";
  }

  if (/user rejected/i.test(msg)) {
    return "Connection cancelled in your wallet. Click Connect again and approve the request in OKX (check for a popup behind this window).";
  }

  if (/sign.*(fail|reject|denied)/i.test(msg)) {
    return "Sign-in message was not approved. Open the OKX extension — the sign prompt may be behind this window.";
  }

  if (/connector already connected/i.test(msg)) {
    return "Wallet already linked in OKX — finishing sign in…";
  }

  if (/failed to fetch|cannot reach api|networkerror/i.test(msg)) {
    return "Cannot reach the FRX API. Confirm NEXT_PUBLIC_API_URL on Vercel and CORS_ORIGIN on Railway include this site URL.";
  }

  if (/cors blocked/i.test(msg)) {
    return "API blocked this site (CORS). Add your Vercel URL to Railway CORS_ORIGIN and redeploy the backend.";
  }

  if (/talisman|not been configured/i.test(msg)) {
    return "Another wallet extension (Talisman) is interfering. Disable unused wallet extensions for this site, keep only OKX, and refresh.";
  }

  if (/pending.*request|already processing/i.test(msg)) {
    return "OKX Wallet is busy with another request. Close any open OKX popups, wait a moment, then try again.";
  }

  if (msg) return msg;

  return "Connection failed. Open OKX Wallet, unlock it, and try again.";
}
