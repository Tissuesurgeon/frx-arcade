# FRX Arcade Economy

## Overview

FRX Arcade uses a **hybrid model**: gameplay credits and tournaments run off-chain (Postgres ledger), while OKB swaps through the Uniswap V4 hook fund treasury and weekly jackpot growth on-chain.

**Credit pricing:** 1 USD of OKB = **25 FRX credits** (live OKB/USD price from OKX/CoinGecko).

---

## Daily tournaments

| Metric | Value |
|--------|-------|
| Players per pool | 10 |
| Entry fee | 20 FRX credits (~$1) |
| Total collected (full pool) | 200 credits |

### Entry fee split (70 / 20 / 10)

| Allocation | Credits | Purpose |
|------------|---------|---------|
| Rewards pool | 14 per join (140 full) | Winner payouts |
| Platform treasury | 4 per join (40 full) | Sustainability |
| Weekly jackpot | 2 per join (20 full) | Funds weekly mega tournament |

### Daily reward table (from 140-credit pool)

| Rank | Reward |
|------|--------|
| 1st | 50 |
| 2nd | 35 |
| 3rd | 20 |
| 4th–5th | 15 each |
| 6th–10th | 2 each |

When a daily pool reaches **10/10 players**, it closes and the AI agent spawns the next daily pool.

---

## Weekly jackpot

| Metric | Value |
|--------|-------|
| Entry fee | 10 FRX credits (half daily) |
| Qualification | Complete **5 daily tournaments** OR reach score threshold (150) |
| Funding | **10% of each settled daily pool** (credited when rewards are distributed) |

The displayed weekly jackpot total is **live** via Socket.IO — it updates immediately when a daily pool settles and its 10% slice is transferred.

### Weekly reward shares

| Rank | Share of pool |
|------|----------------|
| 1st | 35% |
| 2nd | 20% |
| 3rd | 12% |
| 4th–10th | Shared remainder |

---

## Hook integration (on-chain)

**FRXArcadeHook** captures 5% of swap output and splits:

| Bucket | BPS | Purpose |
|--------|-----|---------|
| Tournament treasury | 7000 (70%) | Platform sustainability |
| Weekly jackpot (on-chain bucket) | 2000 (20%) | Routed to TreasuryVault (not gameplay weekly pool) |
| Ecosystem reserve | 1000 (10%) | Long-term reserves |

All slices forward to `TreasuryVault`. On-chain hook fees do **not** fund the off-chain weekly jackpot — that pool is tournament-sourced only.

---

## AI pool manager

The agent (every 2 min):

- Spawns a new **daily** pool when none is open or the current pool is full
- Opens **weekly jackpot** tournaments before epoch end
- Recycles stale empty pools (>2h, zero joins)
- Summarizes anti-cheat flags (OpenAI optional)

API: `GET /api/agent/signals`, `GET /api/agent/economy`

---

## Seasons

Monthly seasons track `UserSeasonStats`: daily completions, weekly entries, total rewards.

API: `GET /api/seasons/current`, `GET /api/seasons/:id/leaderboard`

---

## Economic loop

```
User swaps OKB → FRX Credits (SwapCreditRouter + hook fee)
       ↓
Hook funds platform treasury (on-chain)
       ↓
Player joins daily tournament (70/20/10 split)
       ↓
Player completes 3 attempts → settlement pays ranks
       ↓
After 5 dailies → qualify for weekly jackpot
       ↓
Weekly settlement → large jackpot payouts
```
