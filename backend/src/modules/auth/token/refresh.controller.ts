import type { Request, Response, NextFunction } from "express";
import { RefreshTokenService, refreshTokenService } from "./refresh.service.js";
import { env } from "../../../config/env.js";
import { logger } from "../../../config/logger.js";
import type { ApiResponse } from "../../../common/types/index.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";

export interface RefreshResponseData {
  user: SafeUser;
}

export class RefreshTokenController {
  constructor(private readonly service: RefreshTokenService = refreshTokenService) {}

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      // 1. EXTRACT REFRESH TOKEN
      const rawToken =
        (req.cookies?.refreshToken as string | undefined) ||
        (req.body?.refreshToken as string | undefined);

      const ipAddress = req.ip || undefined;
      const userAgent = req.get("user-agent") || undefined;

      // 2. ROTATE TOKEN
      const result = await this.service.refresh(rawToken, { ipAddress, userAgent });

      // 3. SET ROTATED COOKIES
      res.cookie("accessToken", result.tokens.accessToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
        path: "/",
        maxAge: 15 * 60 * 1000, // 15 minutes
      });

      res.cookie("refreshToken", result.tokens.refreshToken, {
        httpOnly: true,
        secure: env.NODE_ENV === "production",
        sameSite: env.NODE_ENV === "production" ? "none" : "lax",
        ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
        path: "/auth/refresh",
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // 4. RESPONSE
      const response: ApiResponse<RefreshResponseData> = {
        success: true,
        data: {
          user: result.user,
        },
        meta: { requestId, durationMs: Date.now() - startTime },
      };

      res.status(200).json(response);
    } catch (error) {
      logger.warn({ requestId, err: error }, "Token refresh attempt failed");
      next(error);
    }
  };
}

export const refreshTokenController = new RefreshTokenController(refreshTokenService);
