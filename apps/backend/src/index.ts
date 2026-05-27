import "dotenv/config";
import http from "http";
import { createApp } from "./app";
import { connectRedis } from "./lib/redis";
import { attachSocketServer } from "./socket";
import { startAgentWorker } from "./workers/agent";
import { startHookIndexer } from "./workers/hookIndexer";
import { startPriceSyncWorker } from "./workers/priceSync";
import { startSettlementWorker } from "./workers/settlement";
import { startJackpotEpochWorker } from "./workers/jackpotEpoch";

const PORT = Number(process.env.PORT ?? 4000);

async function main() {
  await connectRedis();

  const app = createApp();
  const server = http.createServer(app);
  attachSocketServer(server);
  startAgentWorker();
  startHookIndexer();
  startPriceSyncWorker();
  startSettlementWorker();
  startJackpotEpochWorker();

  server.listen(PORT, () => {
    console.log(`[frx-backend] http://localhost:${PORT}`);
    console.log(`[frx-backend] health http://localhost:${PORT}/health`);
    console.log(`[frx-backend] api docs http://localhost:${PORT}/api/docs`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
