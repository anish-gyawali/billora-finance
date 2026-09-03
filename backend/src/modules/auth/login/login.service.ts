import bcrypt from "bcryptjs";
import { Prisma } from "../../../generated/prisma/client.js";
import { env } from "../../../config/env.js";
import { EmailNotFoundError, WeakPasswordError } from "../../domain/errors.js";
import { LoginRepository, loginRepository } from "./login.repository.js";
import { signAccessToken, signRefreshToken } from "../../../common/auth/jwt.utils.js";
import { toSafeUser } from "../../../common/mappers/user.mapper.js";
import type { LoginInput } from "./login.validation.js";
import type { User } from "../../../generated/prisma/client.js";
import type { AuthTokens } from "../../../common/auth/jwt.utils.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";

export class LoginService {
  constructor(
    private readonly userRepo: LoginRepository = loginRepository,
  ) {}

  /**
   * Production-ready login orchestrator:
   * 1. Finds user by normalized email.
   * 2. Compares password against bcrypt hash (defense in depth).
   * 3. Signs JWT access token (15 min expiry) and refresh token (7 days).
   * 4. Returns sanitized user (without password_hash / mfa_secret) and token pair.
   */
  async login(input: LoginInput, context?: { ipAddress?: string | undefined; userAgent?: string | undefined }): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new EmailNotFoundError(email);
    }

    // 2. Verify password against bcrypt hash
    const passwordMatch = await bcrypt.compare(input.password, user.password_hash!);
    if (!passwordMatch) {
      throw new WeakPasswordError("Invalid email or password");
    }

    // 3. Sign JWT access token (15 min expiry)
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // 4. Sign JWT refresh token (7 days) and obtain its SHA-256 hash
    const {
      token: refreshToken,
      tokenHash,
      expiresAt,
    } = signRefreshToken(user.id);

    // 5. Return sanitized user and tokens
    // Note: Refresh token persistence handled separately via RefreshTokenRepository
    return {
      user: toSafeUser(user),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}

// Export singleton instance for DI container / Route usage
export const loginService = new LoginService();