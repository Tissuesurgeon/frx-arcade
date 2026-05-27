import {
  readOkxAccounts,
  requestOkxAccounts,
  signOkxPersonalMessage,
  syncWagmiAfterOkxConnect,
} from "./okxAuth";

/** @deprecated Use signOkxPersonalMessage from okxAuth */
export async function signWalletMessage(
  account: `0x${string}`,
  message: string
): Promise<`0x${string}`> {
  return signOkxPersonalMessage(account, message);
}

export {
  readOkxAccounts,
  requestOkxAccounts,
  signOkxPersonalMessage,
  syncWagmiAfterOkxConnect,
};
