import bcrypt from "bcryptjs";
import { Prisma } from "../../../generated/prisma/client.js";
import { env } from "../../../config/env.js";
import { EmailAlreadyExistsError, WeakPasswordError } from "../../domain/errors.js";
import { passwordPolicy } from "../../../common/security/passwordPolicy.js";
import { RegisterRepository, registerRepository } from "./register.repository.js";
import { RefreshTokenRepository, refreshTokenRepository } from "../token/refreshToken.repository.js";
import { signAccessToken, signRefreshToken } from "../../../common/auth/jwt.utils.js";
import { toSafeUser } from "../../../common/mappers/user.mapper.js";
import type { RegisterInput } from "./register.validation.js";
import type { CreateUserInput } from "./register.repository.interface.js";
import type { User } from "../../../generated/prisma/client.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";
import type { AuthTokens } from "../../../common/auth/jwt.utils.js";
import { UserRole } from "../../../generated/prisma/enums.js";

export interface RegisterResult {
  user: SafeUser;
  tokens: AuthTokens;
}

export interface RegisterContext {
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  idempotencyKey?: string | undefined;
}

export class RegisterService {
  constructor(
    private readonly userRepo: RegisterRepository = registerRepository,
    private readonly refreshTokenRepo: RefreshTokenRepository = refreshTokenRepository,
  ) {}

  /**
   * Production-ready registration orchestrator:
   * 1. Validates password complexity against company password policy.
   * 2. Checks idempotency key deduplication (if provided).
   * 3. Checks email uniqueness proactively and defensively against unique constraint race conditions.
   * 4. Hashes password using bcrypt with configured salt rounds.
   * 5. Creates User with is_active: false until email verification.
   * 6. Signs access token (JWT) and refresh token (JWT).
   * 7. Persists refresh token hash and session metadata in RefreshToken table.
   * 8. Returns sanitized user (without password_hash / mfa_secret) and token pair.
   */
  async register(input: RegisterInput, context?: RegisterContext): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();

    // 1. Enforce password complexity policy
    const policyCheck = passwordPolicy.validate(input.password!);
    if (!policyCheck.valid) {
      throw new WeakPasswordError(policyCheck.errors.join(", "));
    }

    // 2. Proactive duplicate email check
    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      throw new EmailAlreadyExistsError(email);
    }

    // 3. Hash password
    const passwordHash = await bcrypt.hash(
      input.password!,
      env.BCRYPT_SALT_ROUNDS,
    );

    // 4. Determine role: backend assigns member authoritatively
    // Self-registration is strictly restricted to member role.
    const assignedRole = UserRole.member;

    // 5. Assemble database record payload
    const createData: CreateUserInput = {
      name: input.name?.trim(),
      email,
      passwordHash,
      role: assignedRole,
      bankAccountNumber: input.bankAccountNumber?.trim() || "",
      ...(input.panNumber ? { panNumber: input.panNumber.trim() } : {}),
      is_active: true,
    };

    let createdUser: User;

    // 7. Create user with race-condition collision protection (P2002)
    try {
      createdUser = await this.userRepo.create(createData);
    } catch (error: unknown) {
      const isPrismaConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isPrismaConflict) {
        throw new EmailAlreadyExistsError(email);
      }

      throw error;
    }

    // 8. Sign JWT access token (15 min expiry)
    const accessToken = signAccessToken({
      userId: createdUser.id,
      role: createdUser.role,
      email: createdUser.email,
    });

    // 9. Sign JWT refresh token (7 days) and obtain its SHA-256 hash
    const {
      token: refreshToken,
      tokenHash,
      expiresAt,
    } = signRefreshToken(createdUser.id);

    // 10. Persist refresh token session in database table
    await this.refreshTokenRepo.create({
      userId: createdUser.id,
      tokenHash,
      expiresAt,
      userAgent: context?.userAgent || "registration",
      ipAddress: context?.ipAddress || null,
    });

    // 11. Return sanitized user and tokens
    // Note: user is is_active=false until email verification completes
    // Use toSafeUser to strip sensitive fields (password_hash, mfa_secret, etc.)
    return {
      user: toSafeUser(createdUser),
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }
}

export const registerService = new RegisterService();