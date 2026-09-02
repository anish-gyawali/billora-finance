import type { User } from "../../generated/prisma/client.js";

export type SafeUser = Omit<User, "password_hash" | "mfa_secret">;

/**
 * Sanitizes a User entity by removing sensitive fields (password_hash, mfa_secret).
 */
export function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, mfa_secret: _mfaSecret, ...safeUser } = user;
  return safeUser;
}
