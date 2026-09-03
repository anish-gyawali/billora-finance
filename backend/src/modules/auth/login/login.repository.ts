import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../config/logger.js";
import { InternalServerError } from "../../../domain/errors.js";
import type { ILoginRepository, LoginInput } from "./login.repository.interface.js";
import type { User } from "../../../generated/prisma/client.js";

export class LoginRepository implements ILoginRepository {
  /**
   * Finds user by email with minimal lookups for performance and security hygiene.
   * Normalizes email to lowercase for consistent matching.
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
}

// Export singleton instance for DI container / Service usage
export const loginRepository = new LoginRepository();