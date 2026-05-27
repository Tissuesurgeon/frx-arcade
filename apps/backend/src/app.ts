import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { getCorsOrigin } from "./lib/cors";
import { authRouter } from "./routes/auth";
import { creditsRouter } from "./routes/credits";
import { tournamentsRouter } from "./routes/tournaments";
import { scoresRouter } from "./routes/scores";
import { leaderboardRouter } from "./routes/leaderboard";
import { hooksRouter } from "./routes/hooks";
import { adminRouter } from "./routes/admin";
import { agentRouter, seasonsRouter } from "./routes/agent";
import { statsRouter } from "./routes/stats";
import { globalLimiter } from "./middleware/rateLimit";

export function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
  app.use(
    cors({
      origin: getCorsOrigin(),
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(globalLimiter);

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "frx-backend", ts: new Date().toISOString() });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/credits", creditsRouter);
  app.use("/api/tournaments", tournamentsRouter);
  app.use("/api/scores", scoresRouter);
  app.use("/api/leaderboard", leaderboardRouter);
  app.use("/api/hooks", hooksRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/agent", agentRouter);
  app.use("/api/seasons", seasonsRouter);
  app.use("/api/stats", statsRouter);

  app.get("/api/docs", (_req, res) => {
    res.json({
      openapi: "3.0.0",
      info: { title: "FRX Arcade API", version: "0.2.0" },
      paths: {
        "/health": { get: { summary: "Health check" } },
        "/api/auth/challenge": { post: { summary: "Request SIWE message" } },
        "/api/auth/verify": { post: { summary: "Verify signature → JWT" } },
        "/api/credits/balance": { get: { summary: "FRX Credit balance" } },
        "/api/tournaments": { get: { summary: "Active tournaments" } },
        "/api/scores/submit": { post: { summary: "Submit attempt score" } },
        "/api/leaderboard/global": { get: { summary: "Global rankings" } },
        "/api/hooks/metrics": { get: { summary: "Hook analytics" } },
        "/api/hooks/contracts": { get: { summary: "Hook contract addresses" } },
        "/api/admin/overview": { get: { summary: "Admin dashboard data" } },
      },
    });
  });

  return app;
}
