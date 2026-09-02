import pino from "pino";
import { pinoHttp } from "pino-http";
import type { HttpLogger } from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";

// -----------------------------------------------------------------------------
// Standardized Serializers
// -----------------------------------------------------------------------------

const serializers = {
  // Safe stack traces and error details
  err: pino.stdSerializers.err,

  // Minimal request info without leaking sensitive query/body
  req: (req: any) => ({
    id: req.id,
    method: req.method,
    url: req.url,
    remoteAddress: req.ip || req.socket?.remoteAddress,
  }),

  // Minimal response status
  res: (res: any) => ({
    statusCode: res.statusCode,
  }),
};

// -----------------------------------------------------------------------------
// Logger Configuration (aligned with Security.md for Billora Finance)
// -----------------------------------------------------------------------------

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: serializers.err,
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
  redact: {
    paths: [
      // Authentication Headers
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['set-cookie']",
      "req.headers['x-api-key']",
      "req.headers['proxy-authorization']",
      // Passwords & Credentials
      "password",
      "password_hash",
      "passwordHash",
      "currentPassword",
      "newPassword",
      "confirmPassword",
      "passwordConfirm",
      // Tokens & Keys
      "token",
      "accessToken",
      "refreshToken",
      "mfa_secret",
      "mfaSecret",
      "otp",
      "secret",
      "apiKey",
      // Sensitive Financial / Nepal PII (Security.md Sections 14, 16, 17)
      "pan_number",
      "panNumber",
      "bank_account_number",
      "bankAccountNumber",
      "monthly_salary",
      "monthlySalary",
      // Deep Wildcards
      "*.password",
      "*.password_hash",
      "*.passwordHash",
      "*.token",
      "*.accessToken",
      "*.refreshToken",
      "*.secret",
      "*.mfa_secret",
      "*.pan_number",
      "*.panNumber",
      "*.bank_account_number",
      "*.bankAccountNumber",
      "*.monthly_salary",
      "*.monthlySalary",
    ],
    remove: true,
  },
});

// -----------------------------------------------------------------------------
// HTTP Logger Middleware (pino-http)
// -----------------------------------------------------------------------------

export const httpLogger: HttpLogger = pinoHttp({
  logger,
  serializers,
  genReqId: (req) => {
    const existingId = req.headers["x-request-id"];
    if (typeof existingId === "string" && existingId.length > 0) {
      return existingId;
    }
    return randomUUID();
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    // Suppress repetitive health check log spam in production
    if (env.NODE_ENV === "production" && req.url?.startsWith("/api/health")) {
      return false as unknown as string;
    }
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
});

/**
 * Creates a child logger with bound module or request context.
 */
export const createChildLogger = (bindings: Record<string, unknown>) => {
  return logger.child(bindings);
};

export default logger;
