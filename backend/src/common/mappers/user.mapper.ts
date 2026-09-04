import type { User } from "../../generated/prisma/client.js";

export type SafeUser = Omit<User, "password_hash" | "mfa_secret" | "bank_account_number">;

/**
 * Sanitizes a User entity by removing sensitive fields (password_hash, mfa_secret).
 */
export function toSafeUser(user: User): SafeUser {
  const { password_hash: _passwordHash, mfa_secret: _mfaSecret, bank_account_number: _bankAccountNumber, ...safeUser } = user;
  return safeUser;
}
