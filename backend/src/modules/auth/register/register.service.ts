import bcrypt from "bcryptjs";
import type { Prisma, User } from "../../../generated/prisma/client.js";
import { env } from "../../../config/env.js";
import { EmailAlreadyExistsError, WeakPasswordError } from "../../domain/errors.js";
import { RegisterRepository, registerRepository } from "./register.repository.js";
import { RefreshTokenRepository, refreshTokenRepository } from "../token/refreshToken.repository.js";
import type { RegisterInput } from "./register.validation.js";
import { passwordPolicy } from "../../../common/security/passwordPolicy.js";
import { signAccessToken, signRefreshToken } from "../../../common/auth/jwt.utils.js";
import { toSafeUser } from "../../../common/mappers/user.mapper.js";
import type { SafeUser } from "../../../common/mappers/user.mapper.js";
import type { AuthTokens } from "../../../common/auth/jwt.utils.js";
import { UserRole } from "../../../generated/prisma/enums.js";
import type { CreateUserInput } from "./register.repository.interface.js";

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
   * 2. Checks email uniqueness proactively and defensively against unique constraint race conditions.
   * 3. Hashes password using bcrypt with configured salt rounds.
   * 4. Persists User record to PostgreSQL via Prisma repository.
   * 5. Signs access token (JWT) and refresh token (JWT).
   * 6. Persists refresh token hash and session metadata in RefreshToken table.
   * 7. Returns sanitized user (without password_hash / mfa_secret) and token pair.
   */
  async register(input: RegisterInput, context?: RegisterContext): Promise<RegisterResult> {
    const email = input.email.trim().toLowerCase();

    // 1. Enforce password complexity policy
    const policyCheck = passwordPolicy.validate(input.password);
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
      input.password,
      env.BCRYPT_SALT_ROUNDS,
    );

    // 4. Assemble database record payload (safe default for non-nullable bank_account_number)
    const createData: CreateUserInput = {
      name: input.name.trim(),
      email,
      passwordHash,
      role: UserRole.member,
      bankAccountNumber: input.bankAccountNumber?.trim() || "",
      ...(input.panNumber ? { panNumber: input.panNumber.trim() } : {}),
      is_active: true,
    };

    let createdUser: User;

    // 5. Create user with race-condition collision protection (P2002)
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

    // 6. Sign JWT access token (15 min expiry)
    const accessToken = signAccessToken({
      userId: createdUser.id,
      role: createdUser.role,
      email: createdUser.email,
    });

    // 7. Sign JWT refresh token (7 days) and obtain its SHA-256 hash
    const {
      token: refreshToken,
      tokenHash,
      expiresAt,
    } = signRefreshToken(createdUser.id);

    // 8. Persist refresh token session in database table
    await this.refreshTokenRepo.create({
      userId: createdUser.id,
      tokenHash,
      expiresAt,
      userAgent: context?.userAgent || "registration",
      ipAddress: context?.ipAddress || null,
    });

    // 9. Return sanitized user and tokens
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
