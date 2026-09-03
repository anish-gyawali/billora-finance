import type { Request, Response, NextFunction } from "express";
import { logoutService, LogoutService } from "./logout.service.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type { ApiResponse } from "../../../common/types/index.js";

export interface LogoutResponseData {
  message: string;
}

export class LogoutController {
  constructor(private readonly service: LogoutService = logoutService) {}

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      // 1. EXTRACT REFRESH TOKEN from HttpOnly cookie or payload
      const refreshToken =
        (req.cookies?.refreshToken as string | undefined) ||
        (req.body?.refreshToken as string | undefined);

      const userId = (req as unknown as { user?: { userId?: string } }).user?.userId;

      // 2. SERVICE CALL: Revokes refresh token in database
      const result = await this.service.logout({
        ipAddress: req.ip || undefined,
        userAgent: req.get("user-agent") || undefined,
        refreshToken,
        userId,
      });

      // 3. CLEAR COOKIES with matching domain & security flags
      const cookieClearOptions = {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? ("none" as const) : ("lax" as const),
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
      };

      // Clear access token
      res.clearCookie("accessToken", {
        ...cookieClearOptions,
        path: "/",
      });

      // Clear refresh token across both mounted paths and root
      res.clearCookie("refreshToken", {
        ...cookieClearOptions,
        path: "/auth/refresh",
      });
      res.clearCookie("refreshToken", {
        ...cookieClearOptions,
        path: "/api/auth/refresh",
      });
      res.clearCookie("refreshToken", {
        ...cookieClearOptions,
        path: "/",
      });

      // 4. RESPONSE
      const response: ApiResponse<LogoutResponseData> = {
        success: true,
        data: {
          message: result.message,
        },
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error(
        {
          requestId,
          err: error,
          action: "USER_LOGOUT_FAILED",
        },
        "Unexpected error during logout"
      );
      next(error);
    }
  };
}

export const logoutController = new LogoutController(logoutService);