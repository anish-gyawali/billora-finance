import { prisma } from "../../../lib/prisma.js";
import type { RefreshToken, Prisma } from "../../../generated/prisma/client.js";

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export class RefreshTokenRepository {
  /**
   * Persists a newly signed refresh token hash into the database.
   */
  async create(data: CreateRefreshTokenData): Promise<RefreshToken> {
    const createData: Prisma.RefreshTokenCreateInput = {
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
      user: {
        connect: { id: data.userId },
      },
    };

    return prisma.refreshToken.create({
      data: createData,
    });
  }

  /**
   * Finds an active (non-revoked, unexpired) refresh token record by its SHA-256 hash.
   */
  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  /**
   * Revokes a specific refresh token by timestamping its revokedAt field.
   */
  async revoke(tokenHash: string): Promise<RefreshToken> {
    return prisma.refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active refresh tokens for a specific user (e.g. on logout all devices or password reset).
   */
  async revokeAllForUser(userId: string): Promise<Prisma.BatchPayload> {
    return prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}

export const refreshTokenRepository = new RefreshTokenRepository();
