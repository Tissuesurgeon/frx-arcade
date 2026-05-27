/** FRX credits minted per $1 USD of OKB swapped. */
export const CREDITS_PER_USD = 25;

export const OKB_WEI_SCALE = 10n ** 18n;
export const USD_PRICE_E8_SCALE = 10n ** 8n;

/** Convert a floating OKB/USD spot price to the on-chain 1e8 fixed-point format. */
export function usdPriceToE8(usdPrice: number): bigint {
  if (!Number.isFinite(usdPrice) || usdPrice <= 0) return 0n;
  return BigInt(Math.floor(usdPrice * Number(USD_PRICE_E8_SCALE)));
}

/** credits = floor(okbWei × okbUsdPrice × CREDITS_PER_USD / 1e26) */
export function computeCreditsFromOkbWeiPriceE8(
  okbWei: bigint,
  okbUsdPriceE8: bigint
): bigint {
  if (okbWei <= 0n || okbUsdPriceE8 <= 0n) return 0n;
  return (
    (okbWei * okbUsdPriceE8 * BigInt(CREDITS_PER_USD)) /
    (OKB_WEI_SCALE * USD_PRICE_E8_SCALE)
  );
}

export function computeCreditsFromOkbWei(
  okbWei: bigint,
  okbUsdPrice: number
): bigint {
  return computeCreditsFromOkbWeiPriceE8(okbWei, usdPriceToE8(okbUsdPrice));
}

/** okbWei = floor(credits × 1e26 / (okbUsdPriceE8 × CREDITS_PER_USD)) */
export function computeOkbWeiFromCreditsPriceE8(
  credits: bigint,
  okbUsdPriceE8: bigint
): bigint {
  if (credits <= 0n || okbUsdPriceE8 <= 0n) return 0n;
  return (
    (credits * OKB_WEI_SCALE * USD_PRICE_E8_SCALE) /
    (okbUsdPriceE8 * BigInt(CREDITS_PER_USD))
  );
}

export function computeOkbWeiFromCredits(
  credits: number | bigint,
  okbUsdPrice: number
): bigint {
  const creditAmount =
    typeof credits === "bigint" ? credits : BigInt(Math.floor(credits));
  return computeOkbWeiFromCreditsPriceE8(
    creditAmount,
    usdPriceToE8(okbUsdPrice)
  );
}

export function formatOkbFromWei(okbWei: bigint): string {
  const whole = okbWei / OKB_WEI_SCALE;
  const fraction = okbWei % OKB_WEI_SCALE;
  if (fraction === 0n) return whole.toString();
  const fractionStr = fraction.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${fractionStr}`;
}
