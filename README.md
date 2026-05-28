# FRX Arcade

**Liquidity-powered competitive gaming on X Layer** — players swap OKB through a Uniswap V4 hooked pool to earn FRX Credits, then compete in skill-based **Tile Rush** tournaments funded by programmable liquidity.

Built for the [Build X Hook Hackathon](https://web3.okx.com/xlayer/build-x-hackathon/hook) on OKX X Layer testnet (chain ID **1952**).

---

## Table of contents

- [What is FRX Arcade?](#what-is-frx-arcade)
- [How it works](#how-it-works)
- [Tile Rush (gameplay)](#tile-rush-gameplay)
- [Economy](#economy)
- [Architecture](#architecture)
- [Monorepo layout](#monorepo-layout)
- [Tech stack](#tech-stack)
- [Quick start (local)](#quick-start-local)
- [Environment variables](#environment-variables)
- [Smart contracts](#smart-contracts)
- [API & realtime](#api--realtime)
- [Frontend routes](#frontend-routes)
- [Scripts](#scripts)
- [Deployment](#deployment)
- [Documentation index](#documentation-index)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

---

## What is FRX Arcade?

FRX Arcade connects **DeFi liquidity** to **competitive gaming**:

1. Users swap **OKB** on X Layer through a **Uniswap V4 pool** with a custom hook (`FRXArcadeHook`).
2. The hook captures **5% of swap output** and routes it to on-chain treasury buckets.
3. The swap mints **FRX Credits** — a non-transferable platform currency (no FRX token).
4. Credits pay tournament entry fees; players compete in **Tile Rush** for leaderboard rank and FRX Credit rewards.
5. An **AI tournament agent** spawns pools, monitors the economy, and flags suspicious scores.

There is no transferable FRX token. Credits exist in an off-chain Postgres ledger (with on-chain mint verification for deposits).

---

## How it works

### Player journey

```
Landing / Try free          Connect OKX wallet           Swap OKB → FRX Credits
      │                            │                              │
      ▼                            ▼                              ▼
   /try (guest)              SIWE sign-in                  SwapCreditRouter + V4 hook
   5 attempts, 2 min          JWT session                   25 credits per $1 USD OKB
      │                            │                              │
      └──────────────► Join daily / weekly pool ◄─────────────────┘
                              │
                              ▼
                    Play Tile Rush (3 attempts)
                    Sign each score with wallet
                              │
                              ▼
                    Settlement → FRX Credit rewards
```

### Competitive play flow

1. **Join pool** — FRX Credits are deducted; you are enrolled in the tournament.
2. **Start game** — the run does not begin automatically; you click **Start game** when ready.
3. **Play** — match tiles, fill the tray, score triples before time runs out.
4. **Sign score** — after each attempt, sign a message in OKX Wallet to submit your score.
5. **Retry** — after signing, click **Retry** to start the next attempt (up to 3 per pool).
6. **Settlement** — when the pool closes, ranks are computed and rewards are paid.

### On-chain swap flow

1. User connects **OKX Wallet** on X Layer testnet.
2. User calls `SwapCreditRouter.swapForCredits{value: okb}()`.
3. Router executes a swap on the hooked OKB / aQUOTE pool via Uniswap V4 `PoolManager`.
4. `FRXArcadeHook.afterSwap` captures 5% of output and splits to treasury / jackpot / ecosystem accounting.
5. Router mints FRX Credits via `CreditManager`.
6. Backend verifies the transaction (`Swap`, `SwapRouted`, `CreditsPurchased` events) before crediting the ledger.

---

## Tile Rush (gameplay)

Tile Rush is a **triple-match survival puzzle** inspired by mahjong solitaire layouts.

| Rule | Tournament mode | Free try (`/try`) |
|------|-----------------|-------------------|
| Attempts per session | 3 | 5 |
| Time per run | 5 minutes | 2 minutes |
| Wallet required | Yes | No |
| Scores on leaderboard | Yes | No (local only) |

### Mechanics

- **Board** — 216 tiles in a classic Turtle mahjong layout (144 turtle + 72 gap-fill), stacked in layers.
- **Goal** — tap selectable tiles to move them into the tray; match **3 identical** tile faces to clear them and score.
- **Scoring** — each triple match = 1 point; tournament total = **sum of all 3 attempt scores**.
- **Tray** — starts at 9 slots (easy phase), shrinks to 7 after 5 matches; game over if the tray is full with no triple available.
- **Shuffle** — 2 shuffles per run (reshuffles tile types on the board).
- **End conditions** — time runs out, board cleared, or tray stuck.

### Game client

Tile Rush runs on **Phaser 3** (`packages/game-engine`):

- `createTileRushGame` — Phaser scene: board, tray, shuffle, timer, match logic
- `PhaserTileRush` / `TileRushGame` — React wrapper with HUD (`GameHeader`), sound, and `GameEndModal`
- Used on `/play` and `/try`

Game logic (board layout, turtle mahjong, triple-match rules) lives in `packages/game-engine/src/logic/`.

---

## Economy

Full spec: [docs/ECONOMY.md](docs/ECONOMY.md)

### FRX Credits

| | |
|---|---|
| **Pricing** | 25 credits per $1 USD of OKB (live OKB/USD price synced every 60s) |
| **Storage** | Off-chain Postgres ledger + on-chain `CreditManager` mint on deposit |
| **Transferable** | No |

### Daily tournaments

| | |
|---|---|
| **Pool size** | 10 players |
| **Entry fee** | 20 FRX credits (~$1) |
| **Attempts** | 3 per player |
| **Fee split** | 70% rewards · 20% treasury · 10% weekly jackpot |

When a pool fills (10/10), it closes and the AI agent spawns the next daily pool.

**Reward table** (from 140-credit pool): 1st 50 · 2nd 35 · 3rd 20 · 4th–5th 15 · 6th–10th 2

### Weekly jackpot

| | |
|---|---|
| **Entry fee** | 10 FRX credits |
| **Qualification** | Complete 5 daily tournaments |
| **Funding** | 10% of each settled daily pool (live jackpot updates via Socket.IO) |

### On-chain hook fees (separate from tournament fees)

`FRXArcadeHook` captures **5% of swap output** and splits:

| Bucket | Share | Purpose |
|--------|-------|---------|
| Tournament treasury | 70% | Platform sustainability |
| Jackpot (on-chain bucket) | 20% | Routed to `TreasuryVault` |
| Ecosystem reserve | 10% | Long-term reserves |

On-chain hook fees fund treasury accounting; the **gameplay weekly jackpot** is funded from daily tournament entry fees.

---

## Architecture

```
┌─────────────────┐         HTTPS / WSS          ┌──────────────────────────┐
│  Vercel         │  ─────────────────────────►  │  Railway                 │
│  apps/web       │   REST + Socket.IO           │  apps/backend            │
│  Next.js 15     │                              │  Express + Prisma        │
└────────┬────────┘                              └──────────┬───────────────┘
         │ wagmi / viem                                        │
         ▼                                                     ▼
┌─────────────────┐                              ┌──────────────────────────┐
│  X Layer        │                              │  PostgreSQL + Redis      │
│  SwapCreditRouter│                             │  Workers: agent,         │
│  FRXArcadeHook  │                              │  settlement, hookIndexer │
│  PoolManager    │                              └──────────────────────────┘
└─────────────────┘
```

Detailed diagrams: [ARCHITECTURE.md](ARCHITECTURE.md)

### Backend workers

| Worker | Role |
|--------|------|
| **AI agent** | Spawns daily/weekly pools, recycles stale pools, anti-cheat summaries |
| **Settlement** | Ranks participants, distributes FRX Credit rewards |
| **Hook indexer** | Indexes `SwapRouted` events into daily metrics |
| **Price sync** | Syncs live OKB/USD to `SwapCreditRouter` |
| **Jackpot epoch** | Weekly jackpot lifecycle |

---

## Monorepo layout

```
frx-arcade/
├── apps/
│   ├── web/                 # Next.js 15 frontend (Vercel)
│   │   ├── app/             # App Router pages
│   │   ├── components/      # UI, game, wallet, tournament
│   │   └── lib/             # hooks, tile-rush logic, wagmi, API client
│   └── backend/             # Express API (Railway)
│       ├── src/routes/      # REST endpoints
│       ├── src/services/    # economy, swap verify, anti-cheat
│       ├── src/workers/     # agent, settlement, indexer
│       ├── src/socket/      # Socket.IO namespaces
│       └── prisma/          # Database schema + seed
├── packages/
│   ├── shared/              # Types, Zod schemas, economy constants, socket events
│   ├── contracts/           # Foundry: V4 hook, router, vaults, credits
│   └── game-engine/         # Phaser 3 Tile Rush (optional client)
├── docs/                    # API, economy, contracts, hackathon, realtime
├── docker-compose.yml       # Postgres (5433) + Redis (6379)
├── .env.example             # All environment variables
├── deployment.md            # Vercel + Railway deploy guide
└── ARCHITECTURE.md          # System design deep dive
```

---

## Tech stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS 4, Framer Motion, Zustand, TanStack Query, wagmi/viem, Socket.IO client |
| **Backend** | Express, Prisma, PostgreSQL, Redis, Socket.IO, viem, LangChain (OpenAI optional) |
| **Contracts** | Solidity 0.8.26, Foundry, Uniswap V4 (`v4-core`, `v4-periphery`) |
| **Game** | Phaser 3 (`@frx/game-engine`) + React HUD shell |
| **Wallet** | OKX Wallet (X Layer testnet) |
| **Deploy** | Vercel (web), Railway (API + Postgres + Redis) |

---

## Quick start (local)

**Requirements:** Node.js ≥ 20, npm ≥ 10, Docker (for Postgres/Redis)

```bash
# 1. Clone and install
git clone <repo-url> frx-arcade && cd frx-arcade
npm install

# 2. Start infrastructure (Postgres on host port 5433, Redis on 6379)
docker compose up -d

# 3. Environment
cp .env.example .env
# Edit .env — at minimum set JWT_SECRET; for swaps set contract addresses after deploy

# 4. Database
npm run db:generate
npm run db:push --workspace=@frx/backend
npm run db:seed --workspace=@frx/backend    # optional: baseline tournaments

# 5. Run dev (web :3000 + backend :4000)
npm run dev
```

| Service | URL |
|---------|-----|
| Web app | http://localhost:3000 |
| API health | http://localhost:4000/health |
| Free try (no wallet) | http://localhost:3000/try |
| Get started / demo | http://localhost:3000/demo |
| Dashboard | http://localhost:3000/dashboard |

For the full OKB → credits → tournament loop, deploy contracts to X Layer testnet first — see [docs/HACKATHON.md](docs/HACKATHON.md).

### Contracts (optional for local swap flow)

```bash
cd packages/contracts
bash scripts/setup.sh          # install v4 deps, build, test
# Fund deployer with OKX testnet OKB: https://web3.okx.com/xlayer/faucet/xlayerfaucet
export PRIVATE_KEY=0x...
export XLAYER_RPC_URL=https://testrpc.xlayer.tech/terigon
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast -vv
```

Copy deployed addresses into root `.env` — see [docs/contracts.md](docs/contracts.md).

---

## Environment variables

All variables live in a single root [`.env.example`](.env.example) file (loaded by both apps via `dotenv-cli`).

### Frontend (`NEXT_PUBLIC_*` — exposed to browser)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | Express API base URL |
| `NEXT_PUBLIC_WS_URL` | Socket.IO server URL |
| `NEXT_PUBLIC_CHAIN_ID` | X Layer chain ID (1952) |
| `NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS` | SwapCreditRouter for OKB → credits |
| `NEXT_PUBLIC_FRX_ARCADE_HOOK_ADDRESS` | Hook address (landing / explorer links) |
| `NEXT_PUBLIC_POOL_MANAGER_ADDRESS` | Uniswap V4 PoolManager |
| `NEXT_PUBLIC_TREASURY_VAULT_ADDRESS` | Treasury vault (optional display) |

### Backend

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default 4000) |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis (optional; rate limits) |
| `JWT_SECRET` | Session token signing |
| `CORS_ORIGIN` | Allowed frontend origin(s) |
| `SWAP_CREDIT_ROUTER_ADDRESS` | Router for deposit verification |
| `FRX_ARCADE_HOOK_ADDRESS` | Hook for event indexing |
| `POOL_MANAGER_ADDRESS` | V4 PoolManager |
| `POOL_ID` | Hooked pool ID (bytes32) |
| `HOOK_DEPLOY_BLOCK` | Indexer start block |
| `XLAYER_RPC_URL` | X Layer JSON-RPC |
| `PRIVATE_KEY` | Price sync / redemption payouts (server only) |
| `OPENAI_API_KEY` | AI agent summaries (optional) |
| `ADMIN_WALLETS` | Comma-separated admin wallet addresses |

### Contracts (deploy)

| Variable | Purpose |
|----------|---------|
| `PRIVATE_KEY` | Deployer wallet |
| `XLAYER_RPC_URL` | RPC for deploy + verification |
| `XLAYER_CHAIN_ID` | 1952 |

---

## Smart contracts

Foundry project: [`packages/contracts`](packages/contracts)

| Contract | Role |
|----------|------|
| `FRXArcadeHook` | Uniswap V4 `afterSwap` hook — 5% fee capture, treasury/jackpot/ecosystem split |
| `SwapCreditRouter` | User-facing OKB swap → mint FRX Credits |
| `CreditManager` | Non-transferable credits ledger |
| `TreasuryVault` | Holds hook-routed collateral |
| `TournamentPool` | Per-tournament entry escrow |
| `RewardDistributor` | Merkle reward claims |
| `ArcadeQuoteToken` | V4 pool counter-asset (demo liquidity leg) |

```bash
cd packages/contracts && forge test -vv
```

Full reference: [docs/contracts.md](docs/contracts.md)

---

## API & realtime

### REST API

Base URL: `http://localhost:4000` (dev)

| Area | Key endpoints |
|------|---------------|
| **Auth** | `POST /api/auth/challenge`, `POST /api/auth/verify`, `GET /api/auth/me` |
| **Credits** | `GET /api/credits/balance`, `POST /api/credits/deposit`, `POST /api/credits/withdraw` |
| **Tournaments** | `GET /api/tournaments`, `POST /api/tournaments/join`, `GET /api/tournaments/participations/me` |
| **Scores** | `GET /api/scores/nonce`, `POST /api/scores/submit` |
| **Leaderboard** | `GET /api/leaderboard/global`, `GET /api/leaderboard/tournament/:id` |
| **Hooks** | `GET /api/hooks/metrics`, `GET /api/hooks/contracts` |
| **Agent** | `GET /api/agent/signals`, `GET /api/agent/economy` |
| **Admin** | `GET /api/admin/overview`, `POST /api/admin/tournaments` |

Full API reference: [docs/api.md](docs/api.md)

### Socket.IO

| Namespace | Events | Purpose |
|-----------|--------|---------|
| `/tournaments` | `tournament:feed`, `tournament:update` | Live pool list |
| `/leaderboards` | `leaderboard:snapshot`, `leaderboard:patch` | Rank updates |
| `/jackpot` | `jackpot:tick` | Weekly jackpot total |

Details: [docs/realtime.md](docs/realtime.md)

---

## Frontend routes

| Route | Description |
|-------|-------------|
| `/` | Landing page — hero, economy, how to play |
| `/try` | **Free try** — play without wallet (5 attempts, 2 min/run) |
| `/demo` | Get started — OKX connect, OKB faucet, swap to FRX Credits |
| `/dashboard` | Tournament pools — join daily / weekly |
| `/play?tournament=ID` | Competitive Tile Rush (join → start → play → sign → retry) |
| `/leaderboard` | Global rankings |
| `/leaderboard/:tournamentId` | Per-pool leaderboard |
| `/admin` | Admin dashboard (wallet in `ADMIN_WALLETS`) |

---

## Scripts

Run from repo root:

| Command | Description |
|---------|-------------|
| `npm run dev` | Build shared + start web (:3000) and backend (:4000) |
| `npm run dev:web` | Frontend only |
| `npm run dev:backend` | Backend only |
| `npm run build` | Build all workspaces (Turbo) |
| `npm run lint` | Typecheck / lint all workspaces |
| `npm run docker:up` | Start Postgres + Redis |
| `npm run docker:down` | Stop containers |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed baseline tournaments |
| `npm run db:migrate` | Prisma migrate dev |

Web-specific:

| Command | Description |
|---------|-------------|
| `npm run dev:webpack --workspace=@frx/web` | Next.js with webpack (default, stable file watching) |
| `npm run dev:turbo --workspace=@frx/web` | Next.js Turbopack (faster, needs higher inotify limits) |

---

## Deployment

Production layout:

| Component | Platform |
|-----------|----------|
| Frontend (`apps/web`) | **Vercel** |
| API (`apps/backend`) | **Railway** (Dockerfile recommended) |
| PostgreSQL | Railway plugin |
| Redis | Railway plugin (recommended) |
| Smart contracts | **X Layer testnet** (deploy separately with Foundry) |

Step-by-step guide: [deployment.md](deployment.md)

Hackathon checklist + demo script: [docs/HACKATHON.md](docs/HACKATHON.md)

---

## Documentation index

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System design, core flows, security |
| [deployment.md](deployment.md) | Vercel + Railway production deploy |
| [docs/ECONOMY.md](docs/ECONOMY.md) | Daily/weekly tournaments, fee splits, reward tables |
| [docs/api.md](docs/api.md) | REST API endpoints |
| [docs/contracts.md](docs/contracts.md) | Solidity contracts, deploy, tests |
| [docs/realtime.md](docs/realtime.md) | Socket.IO namespaces and events |
| [docs/HACKATHON.md](docs/HACKATHON.md) | Build X Hook submission checklist |
| [.env.example](.env.example) | All environment variables with comments |

---

## Security

| Area | Mechanism |
|------|-----------|
| **Authentication** | SIWE-style wallet challenge → JWT (httpOnly cookie) |
| **Deposits** | On-chain V4 swap verification (no direct OKB send) |
| **Score submission** | Wallet signature + replay nonce + event hash |
| **Rate limiting** | Per-IP / per-wallet (Redis-backed when configured) |
| **Anti-cheat** | Heuristics + optional AI summary; admin moderation flags |
| **Admin** | Wallet allowlist (`ADMIN_WALLETS`) |

Never commit `.env`, `PRIVATE_KEY`, or `JWT_SECRET` to version control.

---

## Troubleshooting

### `ENOSPC` / file watch limit reached

Next.js dev uses webpack with polling by default. To raise the Linux inotify limit:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Database connection refused

Ensure Docker is running and Postgres is on port **5433** (mapped from container 5432):

```bash
docker compose up -d
docker compose ps
```

### OKX Wallet sign-in issues

- Use the **OKX Wallet browser extension** (not generic `window.ethereum`).
- Complete **Connect** first, then **Sign in** (step 2) in the same click flow.
- After switching accounts, use **Disconnect** in the app before reconnecting.

### Swaps fail / credits not credited

- Confirm contract addresses in `.env` match [deployments/xlayer-testnet.json](packages/contracts/deployments/xlayer-testnet.json).
- Ensure wallet is on **X Layer testnet** (chain 1952) with OKB from the [faucet](https://web3.okx.com/xlayer/faucet/xlayerfaucet).
- Check backend logs for swap verification errors.

### Weekly jackpot shows 0

The live jackpot includes **pending** daily pool contributions, not only settled pools. Ensure the backend is running and Socket.IO is connected (`NEXT_PUBLIC_WS_URL`).

---

## License

Private / hackathon project. See repository for license terms.

---

## Links

- [X Layer testnet explorer](https://www.okx.com/web3/explorer/xlayer-test)
- [OKX testnet faucet](https://web3.okx.com/xlayer/faucet/xlayerfaucet)
- [Build X Hook Hackathon](https://web3.okx.com/xlayer/build-x-hackathon/hook)
- [Uniswap V4 docs](https://docs.uniswap.org/contracts/v4/overview)
