# FRX Arcade API

Base URL: `http://localhost:4000` (dev)

OpenAPI stub: `GET /api/docs`

## Auth

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/challenge` | `{ wallet }` → SIWE message |
| POST | `/api/auth/verify` | `{ wallet, message, signature }` → JWT |
| GET | `/api/auth/me` | Current user |
| POST | `/api/auth/logout` | Clear session cookie |

## Credits

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/credits/balance` | FRX Credit balance (auth) |
| GET | `/api/credits/history` | Ledger entries |
| GET | `/api/credits/deposit/config` | Swap router + hook config (public) |
| POST | `/api/credits/deposit` | Verify V4 swap tx + credit ledger |
| GET | `/api/hooks/contracts` | On-chain hook/pool/router addresses |
| POST | `/api/credits/withdraw` | Queue withdrawal |

## Tournaments

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tournaments` | Active tournaments |
| GET | `/api/tournaments/participations/me` | User pool status (auth) |
| GET | `/api/tournaments/:id/participant/me` | Single pool status (auth) |
| GET | `/api/tournaments/:id` | Tournament detail |
| POST | `/api/tournaments/join` | Join with FRX Credits |

## Scores

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/scores/nonce` | Replay-protection nonce |
| POST | `/api/scores/submit` | Submit signed attempt score |

Tournament aggregate = **sum of attempts 1–3**.

## Leaderboard

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/leaderboard/global` | Global rankings |
| GET | `/api/leaderboard/tournament/:id` | Per-tournament |

## Hooks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hooks/metrics` | Hook analytics |
| GET | `/api/hooks/flow` | Hook flow steps |

## Admin

Requires `ADMIN` role (wallet in `ADMIN_WALLETS`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/admin/overview` | Dashboard stats + AI log |
| GET | `/api/admin/flags` | Moderation flags |
| POST | `/api/admin/tournaments` | Create tournament |
