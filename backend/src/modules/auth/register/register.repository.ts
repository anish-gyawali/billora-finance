import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../config/logger.js";
import { ConflictError, InternalServerError } from "../../../domain/errors.js";
import type { IRegisterRepository, CreateUserInput } from "./register.repository.interface.js";
import type { User } from "../../../generated/prisma/client.js";
import { UserRole } from "../../../generated/prisma/enums.js";

export class RegisterRepository implements IRegisterRepository {
  /**
   * Finds user by email with minimal lookups for performance and security hygiene.
   */
  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();

    logger.debug({ email: normalizedEmail }, "Finding user by email");

    try {
      return await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (error) {
      logger.error({ err: error, email: normalizedEmail }, "DB error finding user by email");
      throw new InternalServerError("Failed to query user");
    }
  }

  /**
   * Creates a new user.
   * Enforces password_hash presence at boundary.
   * Handles P2002 (Unique Constraint) race conditions gracefully.
   * Note: Password length is validated in the schema (min 10 chars),
   * so this guard is defense-in-depth only.
   */
  async create(data: CreateUserInput): Promise<User> {
    const passwordHash = data.password_hash || data.passwordHash || "";

    // 1. Input Sanitization / Guard Clauses
    if (!passwordHash || passwordHash.length < 10) {
      logger.error(
        { email: data.email },
        "Attempt to create user with invalid/missing passwordHash"
      );
      throw new InternalServerError("Invalid password hash provided");
    }

    logger.info({ email: data.email }, "Attempting to create new user");

    try {
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase().trim(),
          password_hash: passwordHash,
          name: data.name?.trim() || "",
          role: data.role ?? UserRole.member,
          bank_account_number: data.bank_account_number || data.bankAccountNumber || "",
          ...(data.pan_number || data.panNumber
            ? { pan_number: (data.pan_number || data.panNumber)!.trim() }
            : {}),
          is_active: data.is_active ?? true,
        },
      });

      logger.info({ userId: user.id, email: user.email }, "User created successfully");
      return user;
    } catch (error) {
      // 2. Specific Prisma Error Handling
      const isPrismaKnown =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isPrismaKnown) {
        logger.warn({ email: data.email }, "Registration conflict: Email already exists");
        throw new ConflictError("Email address is already registered");
      }

      // 3. Generic Fallback
      logger.error({ err: error, email: data.email }, "Failed to create user");
      throw new InternalServerError("Could not create user account");
    }
  }

  /**
   * Allows Service layer to run multiple operations atomically.
   * Example: Create User + Create EmailVerificationToken + Create Default Settings.
   */
  async createWithTransaction<T>(
    callback: (tx: IRegisterRepository) => Promise<T>
  ): Promise<T> {
    return prisma.$transaction(async (txClient) => {
      // Create a transaction-scoped repository instance
      const txRepo = new TransactionRegisterRepository(txClient);
      return callback(txRepo);
    });
  }
}

/**
 * Internal helper class to satisfy IRegisterRepository interface using a Prisma Transaction Client.
 * Keeps the main class clean and ensures type safety inside transactions.
 */
class TransactionRegisterRepository implements IRegisterRepository {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase().trim();
    return this.tx.user.findUnique({
      where: { email: normalizedEmail },
    });
  }

  async create(data: CreateUserInput): Promise<User> {
    const passwordHash = data.password_hash || data.passwordHash || "";
    if (!passwordHash || passwordHash.length < 10) {
      throw new InternalServerError("Invalid password hash in transaction");
    }

    const payload: Prisma.UserCreateInput = {
      email: data.email.toLowerCase().trim(),
      password_hash: passwordHash,
      name: data.name?.trim() || "",
      role: data.role ?? UserRole.member,
      bank_account_number: data.bank_account_number || data.bankAccountNumber || "",
      ...(data.pan_number || data.panNumber
        ? { pan_number: (data.pan_number || data.panNumber)!.trim() }
        : {}),
      is_active: data.is_active ?? true,
    };

    return this.tx.user.create({
      data: payload,
    });
  }

  // Transactions don't nest, but implement to satisfy interface
  async createWithTransaction<T>(callback: (tx: IRegisterRepository) => Promise<T>): Promise<T> {
    return callback(this);
  }
}

// Export singleton instance for DI container / Service usage
export const registerRepository = new RegisterRepository();
