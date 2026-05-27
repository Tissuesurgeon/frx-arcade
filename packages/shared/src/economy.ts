/** Daily tournament: 20 credits ≈ $1 at 25 credits/USD */
export const DAILY_ENTRY_FEE = 20;
export const DAILY_MAX_PLAYERS = 10;

/** Entry fee split: rewards / treasury / weekly jackpot (must sum to 100) */
export const DAILY_FEE_SPLIT = {
  rewards: 70,
  treasury: 20,
  weeklyJackpot: 10,
} as const;

/** Fixed daily payout table (from 140-credit reward pool at full pool) */
export const DAILY_REWARD_TABLE: Record<number, number> = {
  1: 50,
  2: 35,
  3: 20,
  4: 15,
  5: 15,
  6: 2,
  7: 2,
  8: 2,
  9: 2,
  10: 2,
};

export const WEEKLY_ENTRY_FEE = 10;
export const WEEKLY_MAX_PLAYERS = 256;
export const WEEKLY_QUALIFICATION_DAILY_COMPLETIONS = 5;
export const WEEKLY_QUALIFICATION_SCORE_THRESHOLD = 150;

/** Weekly jackpot rank shares (percent of pool) */
export const WEEKLY_REWARD_SHARES = {
  first: 35,
  second: 20,
  third: 12,
} as const;

export type DailyEntrySplit = {
  rewards: number;
  treasury: number;
  weeklyJackpot: number;
};

export function splitDailyEntryFee(fee: number = DAILY_ENTRY_FEE): DailyEntrySplit {
  const rewards = Math.floor((fee * DAILY_FEE_SPLIT.rewards) / 100);
  const treasury = Math.floor((fee * DAILY_FEE_SPLIT.treasury) / 100);
  const weeklyJackpot = fee - rewards - treasury;
  return { rewards, treasury, weeklyJackpot };
}

export function computeDailyReward(rank: number): number {
  return DAILY_REWARD_TABLE[rank] ?? 0;
}

export function computeWeeklyReward(rank: number, poolCredits: number): number {
  if (poolCredits <= 0 || rank < 1) return 0;
  if (rank === 1) return Math.floor((poolCredits * WEEKLY_REWARD_SHARES.first) / 100);
  if (rank === 2) return Math.floor((poolCredits * WEEKLY_REWARD_SHARES.second) / 100);
  if (rank === 3) return Math.floor((poolCredits * WEEKLY_REWARD_SHARES.third) / 100);
  if (rank >= 4 && rank <= 10) {
    const topThree =
      Math.floor((poolCredits * WEEKLY_REWARD_SHARES.first) / 100) +
      Math.floor((poolCredits * WEEKLY_REWARD_SHARES.second) / 100) +
      Math.floor((poolCredits * WEEKLY_REWARD_SHARES.third) / 100);
    const remainder = Math.max(0, poolCredits - topThree);
    const slots = 7;
    return Math.floor(remainder / slots);
  }
  return 0;
}

export function fullDailyRewardPool(): number {
  return splitDailyEntryFee(DAILY_ENTRY_FEE).rewards * DAILY_MAX_PLAYERS;
}
