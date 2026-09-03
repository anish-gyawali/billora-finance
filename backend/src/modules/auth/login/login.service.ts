import bcrypt from "bcryptjs";
import { Prisma } from "../../../generated/prisma/client.js";
import { env } from "../../../config/env.js";
import { UnauthorizedError, ForbiddenError } from "../../../common/errors/AppError.js";
import { LoginRepository, loginRepository } from "./login.repository.js";
import { RefreshTokenRepository, refreshTokenRepository } from "../token/refreshToken.repository.js";
import { signAccessToken, signRefreshToken } from "../../../common/auth/jwt.utils.js";
import { toSafeUser } from "../../../common/mappers/user.mapper.js";
import type { LoginInput } from "./login.validation.js";
import type { User } from "../../../generated/prisma/client.js";
import type { AuthTokens } from "../../../common/auth/jwt.utils.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";

// Standard pre-computed 12-round bcrypt hash used to normalize timing on non-existent users
const DUMMY_BCRYPT_HASH = "$2a$12$e8Y4L51D/X0kG1w1XW3P..63vN3s54MvQkCsmVqjB8wz4LzEfe7hK";

export class LoginService {
  constructor(
    private readonly userRepo: LoginRepository = loginRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository = refreshTokenRepository,
  ) {}

  /**
   * Production-ready login orchestrator:
   * 1. Finds user by normalized email.
   * 2. Defends against email enumeration and timing attacks using a dummy bcrypt hash.
   * 3. Checks whether account is active (is_active).
   * 4. Verifies password against stored bcrypt hash.
   * 5. Signs JWT access token (15m expiry) and refresh token (7 days).
   * 6. Persists refresh token hash and session metadata in RefreshToken table.
   * 7. Returns sanitized user (without password_hash / mfa_secret) and token pair.
   */
  async login(
    input: LoginInput,
    context?: { ipAddress?: string | undefined; userAgent?: string | undefined }
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const email = input.email.trim().toLowerCase();

    // 1. Find user by email
    const user = await this.userRepo.findByEmail(email);

    // 2. Perform password comparison with constant-time defense against timing attacks
    const passwordHashToCompare = user?.password_hash || DUMMY_BCRYPT_HASH;
    const passwordMatch = await bcrypt.compare(input.password, passwordHashToCompare);

    if (!user || !passwordMatch) {
      // Unified error: Never reveal whether the email exists or password was incorrect
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Verify user account is active
    if (!user.is_active) {
      throw new ForbiddenError("Account is inactive or pending verification");
    }

    // 4. Sign JWT access token (15 min expiry)
    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    // 5. Sign JWT refresh token (7 days) and obtain its SHA-256 hash
    const {
      token: refreshToken,
      tokenHash,
      expiresAt,
    } = signRefreshToken(user.id);

    // 6. Persist refresh token session in database table
    await this.refreshTokenRepo.create({
      userId: user.id,
      tokenHash,
      expiresAt,
      userAgent: context?.userAgent || "login",
      ipAddress: context?.ipAddress || null,
    });

    // 7. Return sanitized user and tokens
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