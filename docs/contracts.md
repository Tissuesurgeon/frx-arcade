# FRX Arcade Contracts

Foundry project: `packages/contracts`

Uniswap **V4 Hook** integration for the [Build X Hook Hackathon](https://web3.okx.com/xlayer/build-x-hackathon/hook).

## Contracts

| Contract | Role |
|----------|------|
| `FRXArcadeHook.sol` | `BaseHook` — `afterSwap` fee capture, treasury/jackpot/ecosystem split |
| `SwapCreditRouter.sol` | User-facing V4 swap → mint FRX Credits |
| `ArcadeQuoteToken.sol` | V4 pool counter-asset (demo liquidity leg) |
| `TreasuryVault.sol` | Holds hook-routed collateral |
| `CreditManager.sol` | Non-transferable FRX Credits ledger |
| `TournamentPool.sol` | Per-tournament entry escrow |
| `RewardDistributor.sol` | Merkle reward claims |
| `utils/HookMiner.sol` | CREATE2 salt mining for hook permission bits |
| `utils/BaseHook.sol` | Minimal v4 hook base with permission validation |

## Hook permissions

`FRXArcadeHook` uses:

- `AFTER_SWAP`
- `AFTER_SWAP_RETURNS_DELTA`

Mined via `HookMiner` at deploy time.

## Pool key (default deploy)

| Field | Value |
|-------|-------|
| currency0 | Native OKB (`address(0)`) |
| currency1 | `ArcadeQuoteToken` |
| fee | 3000 (0.3%) |
| tickSpacing | 60 |
| hooks | `FRXArcadeHook` |

## Hook split (default bps)

| Bucket | bps |
|--------|-----|
| Tournament treasury | 4000 |
| Daily jackpot | 3500 |
| Ecosystem reserve | 2500 |

Hook captures **5%** of swap output (`HOOK_SWAP_FEE_BPS`) before splitting.

## Setup

```bash
cd packages/contracts
bash scripts/setup.sh   # installs deps (v4-core, v4-periphery), builds, tests
```

## Deploy (X Layer testnet)

```bash
export PRIVATE_KEY=0x...
export XLAYER_RPC_URL=https://xlayertestrpc.okx.com
forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast -vv
```

If `POOL_MANAGER_ADDRESS` is unset, the script deploys a fresh `PoolManager`.

Record addresses in [`deployments/xlayer-testnet.json`](deployments/xlayer-testnet.json) and root `.env`.

## Tests

```bash
forge test -vv
```

Covers: V4 swap → hook fee routing → credit mint, non-transferable credits, tournament join.

## Hackathon submission

See [docs/HACKATHON.md](../../docs/HACKATHON.md).
