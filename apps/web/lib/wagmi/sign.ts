import { signMessage } from "wagmi/actions";
import { toHex } from "viem";
import { wagmiConfig } from "./config";
import { getOkxEthereumProvider } from "./okx";

const OKX_SIGN_DELAY_MS = 450;

/** Pause between OKX connect + sign prompts so the extension can show both UIs. */
function waitForOkxUi(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, OKX_SIGN_DELAY_MS));
}

/**
 * Request SIWE signature — uses wagmi actions with explicit account, then OKX
 * provider fallback when React hook state is still catching up.
 */
export async function signWalletMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  await waitForOkxUi();

  try {
    const signature = await signMessage(wagmiConfig, { account, message });
    return signature as `0x${string}`;
  } catch (primaryErr) {
    const provider = getOkxEthereumProvider();
    if (!provider) throw primaryErr;

    try {
      const signature = await provider.request({
        method: "personal_sign",
        params: [toHex(message), account],
      });
      return signature as `0x${string}`;
    } catch {
      throw primaryErr;
    }
  }
}
