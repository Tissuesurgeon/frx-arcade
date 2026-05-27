import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

const repoRoot = path.join(__dirname, "../..");
/** Load NEXT_PUBLIC_* from monorepo root `.env` (same file as backend). */
loadEnvConfig(repoRoot);

const usePolling = process.env.WATCHPACK_POLLING === "true";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@frx/shared", "@frx/game-engine"],
  devIndicators: false,
  webpack: (config, { dev }) => {
    if (dev) {
      config.cache = false;
      config.watchOptions = {
        ...config.watchOptions,
        ...(usePolling ? { poll: 1000, aggregateTimeout: 300 } : {}),
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
          "**/.turbo/**",
          "**/out/**",
          "**/cache/**",
          path.join(repoRoot, "packages/contracts"),
          path.join(repoRoot, "apps/backend"),
          path.join(repoRoot, "node_modules"),
        ],
      };
    }
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "pino-pretty": false,
      // MetaMask SDK optional React Native peer — not used in web builds
      "@react-native-async-storage/async-storage": false,
    };
    return config;
  },
};

export default nextConfig;
