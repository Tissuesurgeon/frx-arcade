import type { EIP1193Provider } from "viem";

const DISCONNECT_FLAG_KEY = "frx-wallet-disconnected";

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

/** User clicked Disconnect — do not auto-relink from eth_accounts until Connect. */
export function isWalletManuallyDisconnected(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DISCONNECT_FLAG_KEY) === "1";
}

export function markWalletManuallyDisconnected(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DISCONNECT_FLAG_KEY, "1");
}

export function clearWalletManuallyDisconnected(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DISCONNECT_FLAG_KEY);
}

/** All OKX EVM provider objects, most likely first. */
export function getOkxProviderCandidates(win?: Window): EIP1193Provider[] {
  const w = (win ?? (typeof window !== "undefined" ? window : undefined)) as
    | OkxWindow
    | undefined;
  if (!w) return [];

  const out: EIP1193Provider[] = [];
  const seen = new Set<EIP1193Provider>();

  const add = (p: unknown) => {
    if (isEip1193(p) && !seen.has(p)) {
      seen.add(p);
      out.push(p);
    }
  };

  add(w.okxwallet);
  add(w.okxwallet?.ethereum);

  const eth = w.ethereum;
  if (eth?.providers?.length) {
    for (const p of eth.providers) {
      if (p.isOkxWallet || p.isOKExWallet) add(p);
    }
  }

  if (eth && (eth.isOkxWallet || eth.isOKExWallet)) add(eth);
  add(w.okexchain);

  return out;
}

let activeOkxProvider: EIP1193Provider | null = null;

export function getActiveOkxProvider(): EIP1193Provider | undefined {
  if (activeOkxProvider && getOkxProviderCandidates().includes(activeOkxProvider)) {
    return activeOkxProvider;
  }
  return getOkxProviderCandidates()[0];
}

export function setActiveOkxProvider(provider: EIP1193Provider): void {
  activeOkxProvider = provider;
}

export function clearActiveOkxProvider(): void {
  activeOkxProvider = null;
}

export function getOkxWalletProvider(win?: Window): EIP1193Provider | undefined {
  return getActiveOkxProvider() ?? getOkxProviderCandidates(win)[0];
}

/** @deprecated Use getOkxWalletProvider */
export function getOkxEthereumProvider(win?: Window): EIP1193Provider | undefined {
  return getOkxWalletProvider(win);
}

export function isOkxWalletInstalled(): boolean {
  return getOkxProviderCandidates().length > 0;
}

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
    return "Wallet already linked in OKX — click Approve sign-in message (step 2), or Disconnect first to switch accounts.";
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
