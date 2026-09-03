import type { User } from "../../../generated/prisma/client.js";

// Strict input: Only scalars required for login. No relations, no ID, no timestamps.
export interface LoginInput {
  email: string;
  password: string;
}

export interface ILoginRepository {
  findByEmail(email: string): Promise<User | null>;
  // Optional: verify password against stored hash
  // verifyPassword(passwordHash: string, attempt: string): Promise<boolean>;
}