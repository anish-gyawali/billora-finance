import type { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors/AppError.js";
import { logger } from "../../config/logger.js";
import { env } from "../../config/env.js";
import type { ApiErrorDetail, ApiErrorResponse } from "../types/index.js";

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const requestId = (req.headers["x-request-id"] as string) || undefined;

  // 1. Handled AppError instances
  if (err instanceof AppError) {
    if (!err.isOperational) {
      logger.error({ err, requestId, url: req.originalUrl }, "Non-operational AppError occurred");
    }

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };

    res.status(err.statusCode).json(response);
    return;
  }

  // 2. Zod Schema Validation Errors
  if (err instanceof ZodError) {
    const details: ApiErrorDetail[] = err.issues.map((issue) => ({
      field: issue.path.join("."),
      message: issue.message,
      code: issue.code,
    }));

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Invalid request payload",
        details,
        requestId,
      },
    };

    res.status(422).json(response);
    return;
  }

  // 3. Prisma Known Request Errors
  const errorObj = err as Record<string, unknown>;
  if (typeof errorObj === "object" && errorObj !== null && typeof errorObj["code"] === "string") {
    const prismaCode = errorObj["code"] as string;

    if (prismaCode === "P2002") {
      const meta = errorObj["meta"] as { target?: string[] } | undefined;
      const fields = meta?.target?.join(", ") || "field";
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: "CONFLICT",
          message: `A record with this ${fields} already exists`,
          requestId,
        },
      };
      res.status(409).json(response);
      return;
    }

    if (prismaCode === "P2025") {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "The requested record was not found",
          requestId,
        },
      };
      res.status(404).json(response);
      return;
    }

    if (prismaCode === "P2003") {
      const response: ApiErrorResponse = {
        success: false,
        error: {
          code: "FOREIGN_KEY_VIOLATION",
          message: "Referenced related entity does not exist or cannot be modified",
          requestId,
        },
      };
      res.status(400).json(response);
      return;
    }
  }

  // 4. Invalid JSON syntax from body parser
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: "INVALID_JSON",
        message: "Malformed JSON body in request",
        requestId,
      },
    };
    res.status(400).json(response);
    return;
  }

  // 5. Unhandled / Unexpected Errors
  logger.error(
    {
      err,
      requestId,
      method: req.method,
      url: req.originalUrl,
    },
    "Unhandled exception occurred"
  );

  const isProduction = env.NODE_ENV === "production";
  const message = isProduction
    ? "An unexpected internal server error occurred"
    : err instanceof Error
      ? err.message
      : "Internal server error";

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message,
      requestId,
    },
  };

  res.status(500).json(response);
};

export const notFoundHandler = (req: Request, res: Response): void => {
  const requestId = (req.headers["x-request-id"] as string) || undefined;
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: "NOT_FOUND",
      message: `Cannot ${req.method} ${req.originalUrl}`,
      requestId,
    },
  };
  res.status(404).json(response);
};
