import express from "express";
import type { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./config/logger.js";
import { apiLimiter } from "./common/middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./common/middleware/errorHandler.js";
import { checkDatabaseHealth } from "./lib/prisma.js";
import { registerRoutes } from "./modules/auth/register/register.routes.js";

export const app: Express = express();

// 1. Trust Proxy (CRITICAL for req.ip, req.secure, req.hostname behind reverse proxies)
app.set("trust proxy", env.TRUST_PROXY);

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
  })
);

// Structured HTTP request logging with request-id tracing
app.use(httpLogger);

// Parsers
app.use(cookieParser(env.COOKIE_SECRET));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Rate limiting for API routes
app.use("/api", apiLimiter);

// Auth routes
app.use("/api/auth", registerRoutes);
app.use("/auth", registerRoutes);

// Liveness / Readiness health check endpoint
app.get("/api/health", async (_req, res) => {
  const dbHealth = await checkDatabaseHealth();
  const isHealthy = dbHealth.status === "connected";

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    environment: env.NODE_ENV,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    service: "billora-finance-backend",
    database: dbHealth,
  });
});

// Root metadata route
app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      service: "billora-finance-api",
      status: "running",
      version: "1.0.0",
      endpoints: {
        health: "/api/health",
      },
    },
  });
});

// Handle 404 routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
