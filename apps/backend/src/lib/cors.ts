import type { CorsOptions } from "cors";

/** Allow local / LAN Next.js dev URLs (e.g. http://192.168.x.x:3000). */
const DEV_LAN_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

function configuredOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function getCorsOrigin(): CorsOptions["origin"] {
  const allowed = configuredOrigins();

  if (process.env.NODE_ENV === "production") {
    return allowed;
  }

  return (origin, callback) => {
    if (!origin || allowed.includes(origin) || DEV_LAN_ORIGIN.test(origin)) {
      callback(null, origin ?? allowed[0]);
      return;
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  };
}
