/** X Layer testnet (OKX) — verify before mainnet */
export const XLAYER_CHAIN_ID = 1952;

export const MAX_ATTEMPTS_PER_TOURNAMENT = 3;

/** Hook treasury split in basis points (must sum to 10000) */
export const HOOK_SPLIT_BPS = {
  tournamentTreasury: 7000,
  jackpot: 2000,
  ecosystemReserve: 1000,
} as const;

export const FRX_CREDIT_DECIMALS = 0;

export const SOCKET_NAMESPACES = {
  tournaments: "/tournaments",
  leaderboards: "/leaderboards",
  jackpot: "/jackpot",
} as const;
