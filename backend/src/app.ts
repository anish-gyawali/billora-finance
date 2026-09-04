import express from "express";
import type { Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import { httpLogger } from "./config/logger.js";
import { apiLimiter } from "./common/middleware/rateLimiter.js";
import { errorHandler, notFoundHandler } from "./common/middleware/errorHandler.js";
import { requireAuth } from "./common/middleware/auth.js";
import { checkDatabaseHealth, prisma } from "./lib/prisma.js";
import { toSafeUser } from "./common/mappers/user.mapper.js";
import { NotFoundError } from "./common/errors/AppError.js";
import type { ApiResponse } from "./common/types/index.js";
import type { SafeUser } from "./common/mappers/user.mapper.js";

// Auth route modules — each owns its own path (/register, /login, /logout, /refresh)
import { registerRoutes } from "./modules/auth/register/register.routes.js";
import { loginRoutes } from "./modules/auth/login/login.routes.js";
import { logoutRoutes } from "./modules/auth/logout/logout.routes.js";
import { refreshRoutes } from "./modules/auth/token/refresh.routes.js";
import { accountRoutes } from "./modules/accounts/account.routes.js";
import { periodRoutes } from "./modules/periods/period.routes.js";
import { journalEntryRoutes } from "./modules/journals/journal-entry.routes.js";
import { journalLineRoutes } from "./modules/journal-line/journal-line.routes.js";
import { clientsRoutes } from "./modules/client/clients.routes.js";
import { invoicesRoutes } from "./modules/invoices/invoices.routes.js";
import { vendorsRoutes } from "./modules/vendors/vendors.routes.js";
import { expensesRoutes } from "./modules/expenses/expenses.routes.js";
import { paymentsRoutes } from "./modules/payments/payments.routes.js";
import { salaryRunRoutes } from "./modules/salaries/salary-run.routes.js";
import { salaryItemRoutes } from "./modules/salaries/salary-item.routes.js";

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


app.use("/api/auth", registerRoutes);
app.use("/api/auth", loginRoutes);
app.use("/api/auth", logoutRoutes);
app.use("/api/auth", refreshRoutes);

// Mirror routes without /api prefix (useful during local dev / mobile clients)
app.use("/auth", registerRoutes);
app.use("/auth", loginRoutes);
app.use("/auth", logoutRoutes);
app.use("/auth", refreshRoutes);

// ─── Financial & Accounting Modules ──────────────────────────────────────────
// Chart of Accounts (/api/chart-of-accounts & /api/accounts)
app.use("/api/chart-of-accounts", accountRoutes);
app.use("/api/accounts", accountRoutes);
app.use("/chart-of-accounts", accountRoutes);
app.use("/accounts", accountRoutes);

// Accounting Periods (/api/periods & /periods)
app.use("/api/periods", periodRoutes);
app.use("/api/journal-entries", journalEntryRoutes);
app.use("/api/journal-lines", journalLineRoutes);
app.use("/periods", periodRoutes);

// Client Management (/api/clients)
app.use("/api/clients", clientsRoutes);
app.use("/api/client", clientsRoutes);
app.use("/clients", clientsRoutes);
app.use("/client", clientsRoutes);
app.use("/api/invoices", invoicesRoutes);
app.use("/invoices", invoicesRoutes);
app.use("/api/vendors", vendorsRoutes);
app.use("/vendors", vendorsRoutes);
app.use("/api/expenses", expensesRoutes);
app.use("/expenses", expensesRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/api/salary-runs", salaryItemRoutes);
app.use("/salary-runs", salaryItemRoutes);
app.use("/api/salary-runs", salaryRunRoutes);
app.use("/salary-runs", salaryRunRoutes);

// ─── Protected Route: Current User Profile ────────────────────────────────────
// GET /api/auth/me  →  returns the authenticated user's SafeUser profile
app.get(
  "/api/auth/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new NotFoundError("User not found");
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new NotFoundError("User not found");
      }

      const response: ApiResponse<{ user: SafeUser }> = {
        success: true,
        data: { user: toSafeUser(user) },
      };

      res.status(200).json(response);
    } catch (error) {
      next(error);
    }
  }
);

// ─── Infrastructure Routes ────────────────────────────────────────────────────
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
        register: "/api/auth/register",
        login: "/api/auth/login",
        logout: "/api/auth/logout",
        refresh: "/api/auth/refresh",
        me: "/api/auth/me",
        chartOfAccounts: "/api/chart-of-accounts",
        periods: "/api/periods",
        clients: "/api/clients",
      },
    },
  });
});

// ─── Error Handling ───────────────────────────────────────────────────────────
// Handle 404 routes
app.use(notFoundHandler);

// Centralized error handler
app.use(errorHandler);

export default app;
