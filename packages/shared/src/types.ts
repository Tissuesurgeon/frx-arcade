export type TournamentStatus = "DRAFT" | "OPEN" | "LIVE" | "CLOSED" | "SETTLED";
export type TournamentType =
  | "LIVE"
  | "SCHEDULED"
  | "PRACTICE"
  | "JACKPOT"
  | "DAILY"
  | "WEEKLY_JACKPOT";
export type TournamentTier = "DAILY" | "WEEKLY";
export type LedgerType = "DEPOSIT" | "WITHDRAW" | "ENTRY_FEE" | "REWARD" | "DEMO_GRANT" | "ADJUSTMENT";
export type ScoreStatus = "PENDING" | "VALIDATED" | "FLAGGED" | "REJECTED";
export type AISignalSeverity = "INFO" | "WARN" | "CRITICAL";

export type UserProfile = {
  id: string;
  wallet: string;
  displayName: string | null;
  creditBalance: number;
  createdAt: string;
};

export type Tournament = {
  id: string;
  slug: string;
  title: string;
  type: TournamentType;
  tier?: TournamentTier;
  status: TournamentStatus;
  entryFeeCredits: number;
  prizePoolCredits: number;
  rewardPoolCredits?: number;
  playerCount: number;
  maxPlayers: number;
  startsAt: string;
  endsAt: string;
  jackpotMultiplier: number;
};

export type LeaderboardEntry = {
  rank: number;
  wallet: string;
  displayName: string | null;
  score: number;
  rewardCredits: number;
  tournamentId: string;
};

export type HookMetrics = {
  totalSwaps: number;
  treasuryInflowWei: string;
  jackpotVolumeWei: string;
  tournamentFundingWei: string;
  ecosystemVolumeWei?: string;
  last24hSwaps: number;
  liquidityScore: number;
};

export type CreditLedgerEntry = {
  id: string;
  type: LedgerType;
  amount: number;
  balanceAfter: number;
  txHash: string | null;
  createdAt: string;
};

export type AISignal = {
  id: string;
  severity: AISignalSeverity;
  category: string;
  title: string;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ScoreSubmission = {
  tournamentId: string;
  attemptIndex: number;
  matches: number;
  durationMs: number;
  eventHash: string;
  signature: string;
  nonce: string;
};

export type TournamentAggregateScore = {
  tournamentId: string;
  wallet: string;
  attemptScores: [number, number, number];
  totalScore: number;
  status: ScoreStatus;
};

export type TournamentParticipantStatus = {
  enrolled: boolean;
  participantId?: string;
  attemptsUsed: number;
  completed: boolean;
  attemptScores: [number, number, number];
  totalScore: number;
};
