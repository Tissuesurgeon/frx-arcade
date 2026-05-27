export type AuthChallenge = {
  message: string;
  nonce: string;
  wallet: string;
};

/** Module-level cache — React state is stale inside the same click handler. */
const challengeByWallet = new Map<string, AuthChallenge>();

export function getCachedAuthChallenge(
  wallet: string
): AuthChallenge | undefined {
  return challengeByWallet.get(wallet.toLowerCase());
}

export function setCachedAuthChallenge(challenge: AuthChallenge): void {
  challengeByWallet.set(challenge.wallet.toLowerCase(), challenge);
}

export function clearCachedAuthChallenge(wallet?: string): void {
  if (wallet) {
    challengeByWallet.delete(wallet.toLowerCase());
    return;
  }
  challengeByWallet.clear();
}
