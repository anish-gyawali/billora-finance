import type { Request, Response, NextFunction } from "express";
import { LoginService, loginService } from "./login.service.js";
import type { LoginInput } from "./login.validation.js";
import type { ApiResponse } from "../../../common/types/index.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import { AppError } from "../../../common/errors/AppError.js"; // Custom error classes

export interface LoginResponseData {
  user: SafeUser;
  // accessToken REMOVED from body -> moved to HttpOnly Cookie
}

export class LoginController {
  // Explicit DI for Testability
  constructor(private readonly service: LoginService = loginService) {}

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      // 1. INPUT: req.body is ALREADY validated & sanitized by validate(loginSchema) middleware
      // Type assertion is now SAFE because middleware guarantees shape.
      const input = req.body as LoginInput;

      // 2. METADATA: Safe IP extraction (works because app.set('trust proxy', true) is set)
      const ipAddress = req.ip || undefined;
      const userAgent = req.get("user-agent") || undefined; // Standard Express method

      // 3. SERVICE CALL
      const result = await this.service.login(input, {
        ipAddress,
        userAgent,
      });

      // 4. COOKIES: Secure, HttpOnly, Rotated Refresh Token
      // Access Token (Short lived: 15m) -> HttpOnly Cookie
      res.cookie("accessToken", result.tokens.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax", // "none" for cross-subdomain/prod
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}), // e.g., ".yourdomain.com" (set in env)
        path: "/",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      // Refresh Token (Long lived: 7d) -> HttpOnly Cookie
      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
        path: "/auth/refresh", // Restrict path to ONLY refresh endpoint (Security!)
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // 5. RESPONSE: No tokens in body. Frontend reads user from body, tokens from cookies automatically.
      const response: ApiResponse<LoginResponseData> = {
        success: true,
        data: {
          user: result.user,
        },
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      // 6. AUDIT LOG
      logger.info(
        {
          requestId,
          userId: result.user.id,
          email: result.user.email,
          ip: ipAddress,
          action: "USER_LOGGED_IN",
        },
        "User logged in successfully"
      );

      res.status(200).json(response);
    } catch (error) {
      // 7. KNOWN ERROR HANDLING
      if (error instanceof AppError) {
        logger.warn(
          { requestId, errorCode: error.code, message: error.message },
          "Login failed"
        );

        res.status(error.statusCode).json({
          success: false,
          error: { code: error.code, message: error.message },
          meta: { requestId },
        });
        return;
      }

      // 8. UNKNOWN ERROR -> Global Handler (logs stack trace)
      logger.error({ requestId, err: error }, "Unexpected error during login");
      next(error);
    }
  };
}

export const loginController = new LoginController(loginService);