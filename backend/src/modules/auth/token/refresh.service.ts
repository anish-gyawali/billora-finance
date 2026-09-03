import crypto from "node:crypto";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../config/logger.js";
import { UnauthorizedError, ForbiddenError } from "../../../common/errors/AppError.js";
import {
  verifyRefreshToken,
  signAccessToken,
  signRefreshToken,
  type AuthTokens,
} from "../../../common/auth/jwt.utils.js";
import { RefreshTokenRepository, refreshTokenRepository } from "./refreshToken.repository.js";
import { toSafeUser, type SafeUser } from "../../../common/mappers/user.mapper.js";

export interface RefreshTokenContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export interface RefreshTokenResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export class RefreshTokenService {
  constructor(
    private readonly refreshTokenRepo: RefreshTokenRepository = refreshTokenRepository
  ) {}

  /**
   * Rotates an active refresh token:
   * 1. Validates JWT signature.
   * 2. Checks token hash in DB.
   * 3. Detects token reuse (revokes all sessions if a revoked token is presented).
   * 4. Revokes current token.
   * 5. Issues new access token and newly rotated refresh token.
   * 6. Persists new token hash in database.
   */
  async refresh(
    rawToken: string | undefined,
    context?: RefreshTokenContext
  ): Promise<RefreshTokenResult> {
    if (!rawToken) {
      throw new UnauthorizedError("Refresh token is required");
    }

    // 1. Verify JWT structure & signature
    let payload;
    try {
      payload = verifyRefreshToken(rawToken);
    } catch {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    // 2. Hash token for database lookup
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const tokenRecord = await this.refreshTokenRepo.findByTokenHash(tokenHash);

    if (!tokenRecord) {
      throw new UnauthorizedError("Invalid refresh token session");
    }

    // 3. Token Reuse Detection (Compromise mitigation)
    if (tokenRecord.revokedAt !== null) {
      logger.warn(
        {
          userId: tokenRecord.userId,
          ip: context?.ipAddress,
          userAgent: context?.userAgent,
        },
        "SECURITY ALERT: Revoked refresh token reuse detected. Revoking all active user sessions."
      );
      // Immediately invalidate all tokens for this user
      await this.refreshTokenRepo.revokeAllForUser(tokenRecord.userId);
      throw new UnauthorizedError("Invalid or compromised refresh token");
    }

    // 4. Expiration check
    if (tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedError("Refresh token has expired. Please log in again.");
    }

    // 5. User lookup & active status check
    const user = await prisma.user.findUnique({
      where: { id: tokenRecord.userId },
    });

    if (!user) {
      throw new UnauthorizedError("User account no longer exists");
    }

    if (!user.is_active) {
      throw new ForbiddenError("Account is inactive or pending verification");
    }

    // 6. Token Rotation: Invalidate used token
    await this.refreshTokenRepo.revoke(tokenHash);

    // 7. Generate new token pair
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    const {
      token: newRefreshToken,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
    } = signRefreshToken(user.id);

    // 8. Persist new refresh token in DB
    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: newExpiresAt,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
    });

    logger.info(
      {
        userId: user.id,
        action: "TOKEN_REFRESHED",
        ip: context?.ipAddress,
      },
      "Refresh token rotated successfully"
    );

    return {
      user: toSafeUser(user),
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }
}

export const refreshTokenService = new RefreshTokenService();
