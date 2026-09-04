import { prisma } from "../../../lib/prisma.js";
import type { RefreshToken, Prisma, PrismaClient } from "../../../generated/prisma/client.js";

type TxClient = Prisma.TransactionClient;

export interface CreateRefreshTokenData {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  ipAddress?: string | null | undefined;
  userAgent?: string | null | undefined;
}

export class RefreshTokenRepository {
  private getClient(tx?: TxClient) {
    return (tx ?? prisma) as PrismaClient;
  }

  /**
   * Persists a newly signed refresh token hash into the database.
   */
  async create(data: CreateRefreshTokenData, tx?: TxClient): Promise<RefreshToken> {
    const createData: Prisma.RefreshTokenCreateInput = {
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      ...(data.ipAddress ? { ipAddress: data.ipAddress } : {}),
      ...(data.userAgent ? { userAgent: data.userAgent } : {}),
      user: {
        connect: { id: data.userId },
      },
    };

    return this.getClient(tx).refreshToken.create({
      data: createData,
    });
  }

  /**
   * Finds an active (non-revoked, unexpired) refresh token record by its SHA-256 hash.
   */
  async findByTokenHash(tokenHash: string, tx?: TxClient): Promise<RefreshToken | null> {
    return this.getClient(tx).refreshToken.findUnique({
      where: { tokenHash },
    });
  }

  /**
   * Revokes a specific refresh token by timestamping its revokedAt field.
   */
  async revoke(tokenHash: string, tx?: TxClient): Promise<RefreshToken> {
    return this.getClient(tx).refreshToken.update({
      where: { tokenHash },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Revokes all active refresh tokens for a specific user (e.g. on logout all devices or password reset).
   */
  async revokeAllForUser(userId: string, tx?: TxClient): Promise<Prisma.BatchPayload> {
    return this.getClient(tx).refreshToken.updateMany({
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
