import bcrypt from "bcryptjs";
import { env } from "../../../config/env.js";
import { ForbiddenError, UnauthorizedError, WeakPasswordError } from "../../../common/errors/AppError.js";
import { passwordPolicy } from "../../../common/security/passwordPolicy.js";
import { signAccessToken, signRefreshToken, type AuthTokens } from "../../../common/auth/jwt.utils.js";
import { RefreshTokenRepository, refreshTokenRepository } from "../token/refreshToken.repository.js";
import { PasswordRepository, passwordRepository } from "./password.repository.js";
import type { ChangePasswordInput, ResetPasswordInput } from "./password.validation.js";

export interface PasswordChangeContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
}

export class PasswordService {
  constructor(
    private readonly repository: PasswordRepository = passwordRepository,
    private readonly refreshTokens: RefreshTokenRepository = refreshTokenRepository,
  ) {}

  async change(userId: string, input: ChangePasswordInput, context?: PasswordChangeContext): Promise<AuthTokens> {
    const user = await this.repository.findUser(userId);
    if (!user) throw new UnauthorizedError("User account was not found");
    if (!user.is_active) throw new ForbiddenError("Account is inactive");
    if (!user.must_change_password) throw new ForbiddenError("No temporary password change is required");

    if (!(await bcrypt.compare(input.temporaryPassword, user.password_hash))) {
      throw new UnauthorizedError("Temporary password is incorrect");
    }

    if (input.temporaryPassword === input.newPassword) {
      throw new WeakPasswordError("New password must be different from the temporary password");
    }

    const policyCheck = passwordPolicy.validate(input.newPassword);
    if (!policyCheck.valid) throw new WeakPasswordError(policyCheck.errors.join(", "));

    const passwordHash = await bcrypt.hash(input.newPassword, env.BCRYPT_SALT_ROUNDS);
    await this.repository.completePasswordChange(userId, passwordHash);

    const accessToken = signAccessToken({
      userId: user.id,
      role: user.role,
      email: user.email,
      mustChangePassword: false,
    });
    const refresh = signRefreshToken(user.id);
    await this.refreshTokens.create({
      userId: user.id,
      tokenHash: refresh.tokenHash,
      expiresAt: refresh.expiresAt,
      ipAddress: context?.ipAddress || null,
      userAgent: context?.userAgent || null,
    });

    return { accessToken, refreshToken: refresh.token };
  }

  async resetForUser(userId: string, input: ResetPasswordInput, actorId: string): Promise<void> {
    const policyCheck = passwordPolicy.validate(input.password);
    if (!policyCheck.valid) throw new WeakPasswordError(policyCheck.errors.join(", "));

    const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    await this.repository.setTemporaryPassword(userId, passwordHash, actorId);
  }
}

export const passwordService = new PasswordService();
