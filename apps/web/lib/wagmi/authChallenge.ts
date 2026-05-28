type AuthChallenge = {
  message: string;
  nonce: string;
  wallet: string;
};

/** Module-level cache — React state is stale inside the same click handler. */
const challengeByWallet = new Map<string, AuthChallenge>();

const listeners = new Set<() => void>();

function emitChallengeChange(): void {
  listeners.forEach((l) => l());
}

export function subscribeAuthChallenge(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getCachedAuthChallenge(
  wallet: string
): AuthChallenge | undefined {
  return challengeByWallet.get(wallet.toLowerCase());
}

export function setCachedAuthChallenge(challenge: AuthChallenge): void {
  challengeByWallet.set(challenge.wallet.toLowerCase(), challenge);
  emitChallengeChange();
}

export function clearCachedAuthChallenge(wallet?: string): void {
  if (wallet) {
    challengeByWallet.delete(wallet.toLowerCase());
  } else {
    challengeByWallet.clear();
  }
  emitChallengeChange();
}

export type { AuthChallenge };
