import crypto from "node:crypto";
import { logger } from "../../../config/logger.js";
import { RefreshTokenRepository, refreshTokenRepository } from "../token/refreshToken.repository.js";

export interface LogoutContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  refreshToken?: string | undefined;
  userId?: string | undefined;
}

/**
 * Production-ready logout service:
 * 1. Revokes refresh token in database (preventing any future use)
 * 2. Logs logout event in audit log
 * 3. Returns success status
 */
export class LogoutService {
  constructor(
    private readonly refreshTokenRepo: RefreshTokenRepository = refreshTokenRepository
  ) {}

  /**
   * Logs out the user by revoking their refresh token session in the database.
   */
  async logout(context?: LogoutContext): Promise<{ success: boolean; message: string }> {
    const requestId = context?.ipAddress ? `req-${context.ipAddress.slice(-6)}` : "unknown";

    try {
      // Revoke the refresh token in the database if provided
      if (context?.refreshToken) {
        try {
          const tokenHash = crypto
            .createHash("sha256")
            .update(context.refreshToken)
            .digest("hex");
          await this.refreshTokenRepo.revoke(tokenHash);
        } catch (dbError) {
          // Non-fatal: Token might have already been expired or revoked
          logger.debug({ err: dbError }, "Refresh token could not be revoked in DB (may already be revoked)");
        }
      }

      // Audit log
      logger.info(
        {
          requestId,
          action: "USER_LOGGED_OUT",
          ip: context?.ipAddress,
          userAgent: context?.userAgent,
          userId: context?.userId,
        },
        "User logged out successfully"
      );

      return {
        success: true,
        message: "User logged out successfully",
      };
    } catch (error) {
      logger.error(
        {
          requestId,
          err: error,
          action: "USER_LOGOUT_FAILED",
        },
        "Logout failed unexpectedly"
      );

      // Still return success to ensure client cleans up cookies and local session
      return {
        success: true,
        message: "Logged out (session cleared)",
      };
    }
  }
}

// Export singleton instance for DI container / Route usage
export const logoutService = new LogoutService();