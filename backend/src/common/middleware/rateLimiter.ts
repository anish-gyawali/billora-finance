import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import type { ApiErrorResponse } from "../types/index.js";
import { env } from "../../config/env.js";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req: Request, res: Response) => {
    const requestId = (req.headers["x-request-id"] as string) || undefined;
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many requests from this IP, please try again later.",
        requestId,
      },
    };
    res.status(429).json(response);
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.NODE_ENV === "test" ? 1000 : 20, // Higher limit in test environment
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    const requestId = (req.headers["x-request-id"] as string) || undefined;
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "TOO_MANY_REQUESTS",
        message: "Too many authentication attempts. Please try again after 15 minutes.",
        requestId,
      },
    };
    res.status(429).json(response);
  },
});
