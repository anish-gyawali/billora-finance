import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodType } from "zod";
import { AppError, ErrorCodes } from "../errors/AppError.js";
import type { ApiErrorDetail } from "../types/index.js";

export interface RequestValidationSchema {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/**
 * Validation Middleware (The Gatekeeper):
 * Supports both standalone Zod schemas for body validation (e.g. `validate(registerSchema)`)
 * and structured schemas (e.g. `validate({ body: ..., query: ... })`).
 * Runs transforms (trim, lowercase, strip hyphens) and writes back sanitized data.
 */
export const validate = (schemaOrConfig: ZodType | RequestValidationSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if ("parseAsync" in schemaOrConfig) {
        // Standalone schema: parse and sanitize req.body directly
        req.body = await schemaOrConfig.parseAsync(req.body);
      } else {
        if (schemaOrConfig.body) {
          req.body = await schemaOrConfig.body.parseAsync(req.body);
        }
        if (schemaOrConfig.query) {
          req.query = (await schemaOrConfig.query.parseAsync(req.query)) as Request["query"];
        }
        if (schemaOrConfig.params) {
          req.params = (await schemaOrConfig.params.parseAsync(req.params)) as Request["params"];
        }
      }
      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: ApiErrorDetail[] = error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        }));
        const messages = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ");
        return next(new AppError(messages, 400, ErrorCodes.VALIDATION_ERROR, true, details));
      }
      return next(error);
    }
  };
};
