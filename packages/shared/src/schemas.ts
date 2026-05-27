import { z } from "zod";

export const walletAddressSchema = z
  .string()
  .regex(/^0x[a-fA-F0-9]{40}$/, "Invalid wallet address");

export const authChallengeSchema = z.object({
  wallet: walletAddressSchema,
});

export const authVerifySchema = z.object({
  wallet: walletAddressSchema,
  message: z.string().min(1),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const creditDepositSchema = z.object({
  amountWei: z.string().regex(/^\d+$/),
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
});

export const creditWithdrawSchema = z.object({
  amountCredits: z.number().int().positive(),
});

export const scoreSubmitSchema = z.object({
  tournamentId: z.string().uuid(),
  attemptIndex: z.number().int().min(1).max(3),
  matches: z.number().int().min(0),
  durationMs: z.number().int().min(0),
  eventHash: z.string().min(8),
  nonce: z.string().uuid(),
  signature: z.string().regex(/^0x[a-fA-F0-9]+$/),
});

export const tournamentJoinSchema = z.object({
  tournamentId: z.string().uuid(),
});

export type AuthChallengeInput = z.infer<typeof authChallengeSchema>;
export type AuthVerifyInput = z.infer<typeof authVerifySchema>;
export type CreditDepositInput = z.infer<typeof creditDepositSchema>;
export type CreditWithdrawInput = z.infer<typeof creditWithdrawSchema>;
export type ScoreSubmitInput = z.infer<typeof scoreSubmitSchema>;
export type TournamentJoinInput = z.infer<typeof tournamentJoinSchema>;
