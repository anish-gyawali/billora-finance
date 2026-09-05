import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import type { UserRole } from "../../generated/prisma/enums.js";

export interface AccessTokenPayload {
  userId: string;
  role: UserRole;
  email?: string;
  mustChangePassword?: boolean;
}

export interface RefreshTokenPayload {
  userId: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SignedRefreshTokenResult {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

/**
 * Signs a short-lived JWT access token (15m expiry).
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      ...(payload.email ? { email: payload.email } : {}),
      ...(payload.mustChangePassword ? { mustChangePassword: true } : {}),
    },
    env.JWT_ACCESS_SECRET,
    {
      expiresIn: "15m",
      subject: payload.userId,
      issuer: "billora-finance",
    }
  );
}

/**
 * Signs a cryptographically secure JWT refresh token (7d expiry)
 * and computes its SHA-256 hash for database storage.
 */
export function signRefreshToken(userId: string): SignedRefreshTokenResult {
  const expiresIn = "7d";
  const token = jwt.sign(
    { userId },
    env.JWT_REFRESH_SECRET,
    {
      expiresIn,
      subject: userId,
      issuer: "billora-finance",
    }
  );

  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    token,
    tokenHash,
    expiresAt,
  };
}

/**
 * Verifies and decodes a JWT access token.
 */
export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

/**
 * Verifies and decodes a JWT refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}
