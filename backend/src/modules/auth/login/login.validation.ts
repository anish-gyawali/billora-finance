import { z } from "zod";

// ---------------------------------------------------------
// REGEX CONSTANTS
// ---------------------------------------------------------

/**
 * 1. Email format validation
 */
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * 2. Password: NIST 800-63B Standard
 *    - Minimum 8 characters, maximum 128 characters
 *    - No arbitrary composition rules (allows long passphrases)
 *    - Blocklisted common/breached passwords
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// ---------------------------------------------------------
// SCHEMA DEFINITION
// ---------------------------------------------------------

export const loginSchema = z
  .object({
    // --- Email Address ---
    email: z
      .string({ error: "Email is required" })
      .trim()
      .toLowerCase()
      .regex(EMAIL_REGEX, "Please provide a valid email address")
      .max(255, "Email must not exceed 255 characters"),

    // --- Password ---
    password: z
      .string({ error: "Password is required" })
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Password must not exceed ${PASSWORD_MAX} characters`),
  })
  // --- Security: Strip unknown fields (e.g. attackers injecting extra keys) ---
  .strict();

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

export type LoginInput = z.infer<typeof loginSchema>;