# FRX Arcade

**Liquidity-powered competitive gaming** on X Layer — Uniswap V4 Hooks fund tournaments while players compete in Tile Rush.

Monorepo MVP: Next.js web app, Express/Prisma/Socket.IO backend, Foundry contracts, Phaser 3 game engine, LangChain tournament agent.

## Quick start

```bash
# Infrastructure (Postgres on host **5433** if 5432 is already taken)
docker compose up -d

# Environment
cp .env.example .env

# Install & build shared packages
npm install
npm run db:generate

# Database (requires Postgres running)
npm run db:push --workspace=@frx/backend
npm run db:seed --workspace=@frx/backend

# Dev (web :3000 + backend :4000). Shared is built once; avoids extra file watchers.
npm run dev
```

- **Web**: http://localhost:3000
- **API**: http://localhost:4000/health
- **API docs**: [docs/api.md](docs/api.md)

## Monorepo layout

```
apps/
  web/           Next.js 15, wagmi, Phaser Tile Rush, ShadCN-style UI
  backend/       Express, Prisma, Socket.IO, AI agent worker
packages/
  shared/        Zod schemas, types, socket events
  contracts/     Foundry: V4 FRXArcadeHook, SwapCreditRouter, vaults
  game-engine/   Phaser 3 + tile-rush rules port
```

## Core systems

| System | Description |
|--------|-------------|
| **FRX Credits** | Non-transferable platform currency (no FRX token) |
| **FRXArcadeHook** | Uniswap V4 `afterSwap` hook — 70/20/10 split → treasury / weekly jackpot / reserve |
| **SwapCreditRouter** | OKB swap through hooked pool → mint FRX Credits (25 credits per $1 USD) |
| **Daily tournaments** | 10-player pools, 20 FRX entry, 70/20/10 fee routing |
| **Weekly jackpot** | 10 FRX entry, qualification after 5 dailies, hook-funded pool |
| **Tournaments** | 3 attempts; **total score = sum of all attempts** |
| **Settlement worker** | Ranks participants and pays daily/weekly rewards |
| **AI Agent** | Spawns daily pools when full, opens weekly jackpots, flags cheats |
| **Seasons** | Monthly progression and season leaderboard |
| **Get Started** | OKX testnet OKB → V4 hook swap → FRX credits → join daily pool |

## Hackathon (Build X Hook)

See [docs/HACKATHON.md](docs/HACKATHON.md) for deploy steps, submission checklist, and contract addresses.

See [docs/ECONOMY.md](docs/ECONOMY.md) for the daily/weekly tournament economy and hook funding model.

## Contracts

See [docs/contracts.md](docs/contracts.md). Run tests:

```bash
cd packages/contracts && bash scripts/setup.sh
```

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md).

## Environment

See [.env.example](.env.example) for `web`, `backend`, and `contracts` variables.

See [deployment.md](deployment.md) for deploying the web app to **Vercel** and the API to **Railway**.

## Tech stack

Next.js 15 · React 19 · Tailwind 4 · Framer Motion · Zustand · TanStack Query · wagmi/viem · Phaser 3 · Express · Prisma · PostgreSQL · Redis · Socket.IO · Foundry · LangChain

## Dev troubleshooting

**`ENOSPC` / `OS file watch limit reached`** — Next.js 16 defaults to Turbopack; this repo uses `next dev --webpack` with `WATCHPACK_POLLING=true` to avoid inotify exhaustion. Optional faster mode (needs higher limits): `npm run dev:turbo --workspace=@frx/web`. To raise the Linux inotify limit permanently:

```bash
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```
