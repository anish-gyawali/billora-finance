import pino from "pino";
import { pinoHttp } from "pino-http";
import type { HttpLogger } from "pino-http";
import { randomUUID } from "node:crypto";
import { env } from "./env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "password",
      "password_hash",
      "token",
      "accessToken",
      "refreshToken",
      "mfa_secret",
      "pan_number",
      "bank_account_number",
      "*.password",
      "*.password_hash",
    ],
    remove: true,
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

export const httpLogger: HttpLogger = pinoHttp({
  logger,
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
    return `${req.method} ${req.url} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
  },
});
