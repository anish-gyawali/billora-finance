import { Prisma } from "../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { NotFoundError } from "../../../common/errors/AppError.js";

const passwordUserSelect = {
  id: true,
  email: true,
  role: true,
  password_hash: true,
  is_active: true,
  must_change_password: true,
} as const;

export type PasswordUser = Prisma.UserGetPayload<{ select: typeof passwordUserSelect }>;

export class PasswordRepository {
  findUser(id: string): Promise<PasswordUser | null> {
    return prisma.user.findUnique({ where: { id }, select: passwordUserSelect });
  }

  async completePasswordChange(userId: string, passwordHash: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash,
          must_change_password: false,
          updated_at: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          user_id: userId,
          action: "PASSWORD_CHANGED",
          entity_type: "User",
          entity_id: userId,
        },
      });
    });
  }

  async setTemporaryPassword(userId: string, passwordHash: string, actorId: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId }, select: { id: true } });
      if (!user) throw new NotFoundError("User was not found");

      await tx.user.update({
        where: { id: userId },
        data: {
          password_hash: passwordHash,
          must_change_password: true,
          updated_at: new Date(),
        },
      });

      await tx.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });

      await tx.auditLog.create({
        data: {
          user_id: actorId,
          action: "USER_PASSWORD_RESET",
          entity_type: "User",
          entity_id: userId,
        },
      });
    });
  }
}

export const passwordRepository = new PasswordRepository();
