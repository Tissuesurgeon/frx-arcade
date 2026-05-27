# Build X Hook Hackathon — FRX Arcade Submission

Hackathon: [Build X Hook Hackathon](https://web3.okx.com/xlayer/build-x-hackathon/hook)  
Deadline: **May 28, 2026 23:59 UTC**  
Submission form: [Google Form](https://docs.google.com/forms/d/e/1FAIpQLSdH_ZfkA7qREpVciUrTVBy9zZHssvBgbvATVzkt0Sog_usq2Q/viewform)

## Project summary

**FRX Arcade** is a liquidity-powered competitive gaming platform on X Layer. Players swap OKB through a **Uniswap V4 hooked pool**; `FRXArcadeHook` captures swap fees (70/20/10 treasury / weekly jackpot / ecosystem) and routes them on-chain. Swaps mint **FRX Credits** (25 per $1 USD) for **daily** and **weekly jackpot** tournaments.

Full economy spec: [docs/ECONOMY.md](ECONOMY.md)

## Hackathon requirements checklist

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Built around Uniswap V4 Hook | Done | [`FRXArcadeHook.sol`](../packages/contracts/src/FRXArcadeHook.sol) extends `BaseHook`, implements `afterSwap` |
| Deploy V4 Pool + Hook on X Layer | Deploy step | [`script/Deploy.s.sol`](../packages/contracts/script/Deploy.s.sol) |
| Hook triggered by real swap txs | Done | [`SwapCreditRouter.sol`](../packages/contracts/src/SwapCreditRouter.sol) → `PoolManager.swap` |
| Verifiable contract addresses | Fill after deploy | [`deployments/xlayer-testnet.json`](../packages/contracts/deployments/xlayer-testnet.json) |
| Dedicated X account + tags | Manual | Tag @XLayerOfficial @Uniswap @flapdotsh |

## Deploy to X Layer testnet

```bash
cd packages/contracts
bash scripts/setup.sh

# Fund deployer with OKX testnet faucet OKB
# https://web3.okx.com/xlayer/faucet/xlayerfaucet

export PRIVATE_KEY=0x...
export XLAYER_RPC_URL=https://xlayertestrpc.okx.com

# Optional: use existing PoolManager if known
# export POOL_MANAGER_ADDRESS=0x...

forge script script/Deploy.s.sol --rpc-url $XLAYER_RPC_URL --broadcast -vv
```

Copy logged addresses into root `.env` (see [`.env.example`](../.env.example)).

Update [`deployments/xlayer-testnet.json`](../packages/contracts/deployments/xlayer-testnet.json) with deployed addresses and `HOOK_DEPLOY_BLOCK` from broadcast logs.

## Verify on-chain

1. Open `/demo` → connect OKX on X Layer testnet (1952)
2. Swap OKB via **Swap via FRX Hook**
3. On [X Layer testnet explorer](https://www.okx.com/web3/explorer/xlayer-test), confirm tx includes:
   - `Swap` from PoolManager
   - `SwapRouted` from FRXArcadeHook
   - `CreditsPurchased` from SwapCreditRouter
4. Dashboard hook metrics should increment after indexer poll (~30s)

## Demo video outline (optional, 1–3 min)

1. Show hook + router addresses on landing page
2. Execute one swap; open explorer tx with `SwapRouted` event
3. Show FRX credits balance update
4. Join **daily** tournament (20 FRX) → play Tile Rush (3 attempts) → settlement pays ranks
5. After 5 dailies, join **weekly jackpot** (10 FRX entry)

## Social submission

- Create/use dedicated project X account
- Post build progress throughout hackathon
- Submission post must tag: **@XLayerOfficial**, **@Uniswap**, **@flapdotsh**
- Include hook contract address + demo link

## Scoring alignment

| Criterion | FRX Arcade angle |
|-----------|------------------|
| Innovation | Gaming treasury hook — swap fees autonomously fund esports prize pools |
| Market potential | Real swap path → credits → tournaments on X Layer low-cost environment |
| Completion | End-to-end: V4 swap → hook split → credits → play → leaderboard |
| Demo video | Optional; script above |

## Support

- [X Layer Builder Hub (Telegram)](https://t.me/+JInfz0yF9ihjNGE1)
- [Uniswap v4 hook docs](https://developers.uniswap.org/docs/protocols/v4/guides/hooks/getting-started)
