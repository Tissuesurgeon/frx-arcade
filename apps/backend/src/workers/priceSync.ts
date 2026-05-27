import { syncOkbPriceToRouter } from "../services/priceSync";

const INTERVAL_MS = 60_000;

export function startPriceSyncWorker(): void {
  if (process.env.DISABLE_PRICE_SYNC === "true") {
    console.log("[price-sync] disabled via DISABLE_PRICE_SYNC");
    return;
  }
  const tick = () => {
    void syncOkbPriceToRouter().catch((err) => {
      console.warn(
        "[price-sync]",
        err instanceof Error ? err.message : String(err)
      );
    });
  };

  tick();
  setInterval(tick, INTERVAL_MS);
}
