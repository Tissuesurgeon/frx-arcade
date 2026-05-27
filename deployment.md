# Deployment Guide — FRX Arcade

Deploy the **Next.js frontend** to [Vercel](https://vercel.com) and the **Express + Prisma + Socket.IO backend** to [Railway](https://railway.app).

Smart contracts stay on **X Layer testnet** (deployed separately with Foundry — see [docs/HACKATHON.md](docs/HACKATHON.md)). Vercel and Railway host the web app and API only.

## Architecture

```
┌─────────────────┐         HTTPS / WSS          ┌──────────────────────────┐
│  Vercel         │  ─────────────────────────►  │  Railway                 │
│  apps/web       │   NEXT_PUBLIC_API_URL        │  apps/backend            │
│  (Next.js 15)   │   NEXT_PUBLIC_WS_URL         │  Express + Socket.IO     │
└─────────────────┘                              └──────────┬───────────────┘
                                                            │
                              ┌─────────────────────────────┼─────────────────┐
                              │                             │                 │
                         PostgreSQL                      Redis            X Layer RPC
                      (Railway plugin)              (Railway plugin)    (contracts)
```

| Component | Platform | Notes |
|-----------|----------|--------|
| Frontend | Vercel | `apps/web` — static + SSR Next.js |
| API + WebSocket | Railway | `apps/backend` — long-running Node process |
| Database | Railway PostgreSQL | Prisma (`DATABASE_URL`) |
| Cache / rate limits | Railway Redis | Optional but recommended (`REDIS_URL`) |
| Contracts | X Layer | Not hosted on Vercel/Railway |

**Requirements:** Node.js **≥ 20**, npm **≥ 10**. This repo uses npm workspaces (`apps/*`, `packages/*`).

---

## Prerequisites

1. **GitHub repo** connected to Vercel and Railway.
2. **Contracts deployed** on X Layer testnet (or use addresses in [`packages/contracts/deployments/xlayer-testnet.json`](packages/contracts/deployments/xlayer-testnet.json)).
3. **Secrets ready** — copy from [`.env.example`](.env.example) and fill production values.

Generate a strong JWT secret:

```bash
openssl rand -base64 48
```

---

## Part 1 — Railway (backend + database)

Deploy the backend first so you have a public API URL for Vercel.

### 1.1 Create the project

1. [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo** → select `frx-arcade`.
2. Add **PostgreSQL**: project → **+ New** → **Database** → **PostgreSQL**.
3. Add **Redis** (recommended): **+ New** → **Database** → **Redis**.

### 1.2 Configure the backend service

**Option A — Dockerfile (recommended)**

1. Railway service → **Settings** → **Build** → set **Builder** to **Dockerfile**.
2. **Dockerfile path:** `apps/backend/Dockerfile`
3. **Root Directory:** leave empty (repository root — required for npm workspaces).
4. Generate a public domain under **Networking**.

The image builds `@frx/shared` + `@frx/backend`, runs `prisma db push` on startup, then starts the API. See [`apps/backend/Dockerfile`](apps/backend/Dockerfile).

Local test:

```bash
docker build -f apps/backend/Dockerfile -t frx-backend .
docker run --rm -p 4000:4000 --env-file .env frx-backend
```

**Option B — Nixpacks (no Docker)**

Open the **GitHub-connected service** (not the database services) and set:

| Setting | Value |
|---------|--------|
| **Root Directory** | *(leave empty — repo root)* |
| **Watch Paths** | `apps/backend/**`, `packages/shared/**` |

**Build command** (Option B only):

```bash
npm ci && npm run build --workspace=@frx/shared && npm run db:generate --workspace=@frx/backend && npm run build --workspace=@frx/backend
```

**Start command** (Option B only):

```bash
npm run start --workspace=@frx/backend
```

**Release command** (Option B only — optional; Dockerfile runs `db push` on container start):

```bash
npm run db:push --workspace=@frx/backend
```

> Skip the release command on the first deploy if you prefer to run `db:push` manually once (see §1.5). With **Dockerfile**, schema is applied automatically when the container starts.

Railway sets **`PORT`** automatically — the backend reads `process.env.PORT` (default `4000` locally).

### 1.3 Link database variables

On the **backend service** → **Variables**:

1. **Reference** the Postgres plugin variable:  
   `DATABASE_URL` → `${{Postgres.DATABASE_URL}}`
2. **Reference** Redis (if added):  
   `REDIS_URL` → `${{Redis.REDIS_URL}}`

### 1.4 Backend environment variables

Set these on the Railway backend service (adjust values for production):

```env
NODE_ENV=production

# Railway provides DATABASE_URL and REDIS_URL via references above
JWT_SECRET=<long-random-string>

# Your Vercel URL — set after Vercel deploy, or use a custom domain
CORS_ORIGIN=https://your-app.vercel.app

# X Layer / contract verification (same addresses as local .env)
SWAP_CREDIT_ROUTER_ADDRESS=0x...
FRX_ARCADE_HOOK_ADDRESS=0x...
POOL_MANAGER_ADDRESS=0x...
POOL_ID=0x...
ARCADE_QUOTE_TOKEN_ADDRESS=0x...
TREASURY_VAULT_ADDRESS=0x...
HOOK_DEPLOY_BLOCK=31262833
XLAYER_RPC_URL=https://testrpc.xlayer.tech/terigon
XLAYER_CHAIN_ID=1952

# Optional: OKB→FRX redemption payouts + on-chain price sync
PRIVATE_KEY=0x...
OPENAI_API_KEY=sk-...

# Comma-separated admin wallets
ADMIN_WALLETS=0x...
```

See [`.env.example`](.env.example) for descriptions of each variable.

### 1.5 Initialize the database

**Option A — Release command** (§1.2): redeploy after adding the release command.

**Option B — Railway shell / one-off:**

```bash
npm run db:push --workspace=@frx/backend
npm run db:seed --workspace=@frx/backend
```

`db:seed` is optional (creates baseline tournament/practice data).

### 1.6 Public URL

1. Backend service → **Settings** → **Networking** → **Generate Domain**.
2. Note the URL, e.g. `https://frx-backend-production.up.railway.app`.
3. Verify:

```bash
curl https://YOUR-RAILWAY-DOMAIN/health
```

Expected: `{"ok":true}` (or similar health payload).

Use this URL for Vercel:

- `NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN`
- `NEXT_PUBLIC_WS_URL=https://YOUR-RAILWAY-DOMAIN`

### 1.7 CORS after Vercel deploy

Once Vercel is live, update Railway:

```env
CORS_ORIGIN=https://your-app.vercel.app
```

For preview deployments, use a comma-separated list:

```env
CORS_ORIGIN=https://your-app.vercel.app,https://your-app-git-main-you.vercel.app
```

In **production**, only origins listed in `CORS_ORIGIN` are allowed (no LAN localhost fallback).

---

## Part 2 — Vercel (frontend)

### 2.1 Import the project

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import the same GitHub repo.
2. **Framework Preset:** Next.js.
3. **Root Directory:** `apps/web`  
   Enable **“Include source files outside of the Root Directory”** (required for workspace packages `@frx/shared`, `@frx/game-engine`).

### 2.2 Build settings

| Setting | Value |
|---------|--------|
| **Install Command** | `cd ../.. && npm ci` |
| **Build Command** | `cd ../.. && npm run build --workspace=@frx/shared && npm run build --workspace=@frx/web` |
| **Output Directory** | *(default — leave empty)* |
| **Node.js Version** | 20.x |

Alternative using Turbo from repo root:

```bash
cd ../.. && npm ci && npx turbo run build --filter=@frx/web
```

### 2.3 Vercel environment variables

Add in **Project → Settings → Environment Variables** (Production + Preview):

```env
NODE_ENV=production

NEXT_PUBLIC_API_URL=https://YOUR-RAILWAY-DOMAIN
NEXT_PUBLIC_WS_URL=https://YOUR-RAILWAY-DOMAIN
NEXT_PUBLIC_CHAIN_ID=1952
NEXT_PUBLIC_XLAYER_RPC_URL=https://testrpc.xlayer.tech/terigon

NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS=0x...
NEXT_PUBLIC_FRX_ARCADE_HOOK_ADDRESS=0x...
NEXT_PUBLIC_POOL_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_TREASURY_VAULT_ADDRESS=0x...
NEXT_PUBLIC_CREDIT_MANAGER_ADDRESS=0x...
```

Only `NEXT_PUBLIC_*` variables belong on Vercel. **Never** put `JWT_SECRET`, `PRIVATE_KEY`, or `DATABASE_URL` on Vercel.

Contract addresses should match Railway backend and [`packages/contracts/deployments/xlayer-testnet.json`](packages/contracts/deployments/xlayer-testnet.json).

### 2.4 Deploy

Click **Deploy**. After success, open the Vercel URL and confirm:

- Landing page loads
- Wallet connect works (X Layer testnet, chain ID **1952**)
- Dashboard loads tournaments (API reachable)
- Browser devtools → Network: API calls go to your Railway domain, not `localhost:4000`

### 2.5 Custom domain (optional)

1. Vercel → **Domains** → add `arcade.example.com`.
2. Update Railway `CORS_ORIGIN` to include `https://arcade.example.com`.

---

## Part 3 — Post-deploy checklist

| Check | How |
|-------|-----|
| API health | `GET https://<railway>/health` |
| Tournaments API | `GET https://<railway>/api/tournaments` |
| CORS | Open site on Vercel; sign in with wallet — no CORS errors in console |
| WebSocket | Leaderboard page updates (Socket.IO via `NEXT_PUBLIC_WS_URL`) |
| Swaps | `/demo` → Swap OKB → credits increase (router address set on both sides) |
| DB schema | Railway logs show successful `db push` / no Prisma errors on boot |
| Workers | Railway logs show agent, settlement, hook indexer, price sync started |

Backend workers start automatically in [`apps/backend/src/index.ts`](apps/backend/src/index.ts) (agent, settlement, hook indexer, etc.) — no separate Railway service needed.

---

## Environment variable reference

### Vercel only (`NEXT_PUBLIC_*`)

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_API_URL` | REST API base URL (Railway) |
| `NEXT_PUBLIC_WS_URL` | Socket.IO URL (same Railway host) |
| `NEXT_PUBLIC_CHAIN_ID` | `1952` for X Layer testnet |
| `NEXT_PUBLIC_XLAYER_RPC_URL` | Public RPC for wagmi/viem |
| `NEXT_PUBLIC_SWAP_CREDIT_ROUTER_ADDRESS` | OKB → FRX swap router |
| `NEXT_PUBLIC_FRX_ARCADE_HOOK_ADDRESS` | Hook address (UI / explorer links) |
| `NEXT_PUBLIC_POOL_MANAGER_ADDRESS` | Uniswap V4 PoolManager |
| `NEXT_PUBLIC_TREASURY_VAULT_ADDRESS` | Optional display |
| `NEXT_PUBLIC_CREDIT_MANAGER_ADDRESS` | Optional / future on-chain reads |

### Railway only (secrets + server)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Postgres (from Railway plugin) |
| `REDIS_URL` | Redis (from Railway plugin) |
| `JWT_SECRET` | Session JWT signing |
| `CORS_ORIGIN` | Allowed browser origin(s) |
| `SWAP_CREDIT_ROUTER_ADDRESS` | Verify swap txs |
| `FRX_ARCADE_HOOK_ADDRESS` | Verify hook events |
| `POOL_MANAGER_ADDRESS` | Verify pool swaps |
| `POOL_ID` | Pool identifier |
| `HOOK_DEPLOY_BLOCK` | Hook indexer start block |
| `PRIVATE_KEY` | Price sync + FRX→OKB payouts |
| `OPENAI_API_KEY` | AI agent summaries (optional) |
| `ADMIN_WALLETS` | Admin role wallets |

Full list: [`.env.example`](.env.example).

---

## Troubleshooting

### CORS errors from Vercel

- Set `CORS_ORIGIN` on Railway to the **exact** Vercel origin (scheme + host, no trailing slash).
- Redeploy Railway after changing `CORS_ORIGIN`.

### API calls still hit `localhost:4000`

- `NEXT_PUBLIC_API_URL` was not set on Vercel, or the app was not redeployed after adding it.
- Rebuild Vercel with env vars applied to **Production**.

### `PrismaClientInitializationError`

- Confirm `DATABASE_URL` is referenced from the Postgres plugin on the **backend** service.
- Run `npm run db:push --workspace=@frx/backend` against the production database.

### Build fails on Vercel — cannot find `@frx/shared`

- Root Directory must be `apps/web` with **include files outside root** enabled.
- Install command must run from repo root: `cd ../.. && npm ci`.

### Build fails on Railway — Prisma client missing

- Ensure build includes: `npm run db:generate --workspace=@frx/backend` **before** `npm run build --workspace=@frx/backend`.

### WebSocket / realtime not working

- `NEXT_PUBLIC_WS_URL` must be the Railway HTTPS URL (not `ws://localhost`).
- Railway service must be **public** (generated domain enabled).

### Redis unavailable

- Backend falls back to in-memory rate limits if Redis is down ([`apps/backend/src/lib/redis.ts`](apps/backend/src/lib/redis.ts)).
- For production traffic, attach the Redis plugin and set `REDIS_URL`.

### Swap verification fails in production

- Backend and Vercel must use the **same** router/hook/pool manager addresses.
- `XLAYER_RPC_URL` must reach X Layer testnet from Railway’s network.

---

## Local vs production

| | Local | Production |
|---|--------|------------|
| Web | `http://localhost:3000` | `https://*.vercel.app` |
| API | `http://localhost:4000` | `https://*.up.railway.app` |
| Postgres | Docker `:5433` | Railway Postgres |
| Redis | Docker `:6379` | Railway Redis |
| Env file | Root `.env` | Platform dashboards |

Local dev: [README.md](README.md) (`docker compose up -d`, `npm run dev`).

---

## Optional: `railway.toml` / `vercel.json`

You can commit platform config for repeatable deploys.

**`railway.toml`** (repo root — Dockerfile deploy):

```toml
[build]
builder = "DOCKERFILE"
dockerfilePath = "apps/backend/Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 120
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**`railway.toml`** (Nixpacks deploy):

```toml
[build]
builder = "NIXPACKS"
buildCommand = "npm ci && npm run build --workspace=@frx/shared && npm run db:generate --workspace=@frx/backend && npm run build --workspace=@frx/backend"

[deploy]
startCommand = "npm run start --workspace=@frx/backend"
releaseCommand = "npm run db:push --workspace=@frx/backend"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

**`apps/web/vercel.json`**:

```json
{
  "installCommand": "cd ../.. && npm ci",
  "buildCommand": "cd ../.. && npm run build --workspace=@frx/shared && npm run build --workspace=@frx/web"
}
```

These are optional; the dashboard settings in §1.2 and §2.2 are equivalent.

---

## Related docs

- [README.md](README.md) — local development
- [`.env.example`](.env.example) — all environment variables
- [docs/HACKATHON.md](docs/HACKATHON.md) — contract deploy on X Layer
- [docs/api.md](docs/api.md) — API reference
- [ARCHITECTURE.md](ARCHITECTURE.md) — system overview
