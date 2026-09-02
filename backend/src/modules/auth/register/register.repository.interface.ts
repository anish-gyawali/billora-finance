import type { User } from "../../../generated/prisma/client.js";
import type { UserRole } from "../../../generated/prisma/enums.js";

// Strict input: Only scalars required for registration. No relations, no ID, no timestamps.
export interface CreateUserInput {
  email: string;
  passwordHash: string; // Enforce hashed password at boundary
  name?: string | null;
  role?: UserRole;
  bankAccountNumber?: string;
  panNumber?: string | null;
  // Compatibility aliases with Prisma schema snake_case
  password_hash?: string;
  bank_account_number?: string;
  pan_number?: string | null;
  is_active?: boolean;
}

export interface IRegisterRepository {
  findByEmail(email: string): Promise<User | null>;
  create(data: CreateUserInput): Promise<User>;
  // Optional: for atomic operations (e.g., create User + EmailVerificationToken)
  createWithTransaction<T>(
    callback: (tx: IRegisterRepository) => Promise<T>
  ): Promise<T>;
}
