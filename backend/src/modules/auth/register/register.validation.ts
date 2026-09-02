import { z } from "zod";

// ---------------------------------------------------------
// NEPAL SPECIFIC REGEX CONSTANTS
// ---------------------------------------------------------

/**
 * 1. Nepal PAN: 9 Digits.
 * First digit: 1-9 (1=Individual, 3=Company/Firm, 6=Partnership, etc)
 * Format: NNNNNNNNN (No dashes, no letters)
 */
export const NEPAL_PAN_REGEX = /^[1-9]\d{8}$/;

/**
 * 2. Nepal Bank Account: 13 to 17 Digits.
 * Most major banks (Nabil, NMB, Global, Himalayan, NIC Asia, Standard Chartered, etc.) use 13-16.
 * Some newer core banking systems go up to 17 digits.
 * Hyphens and spaces are stripped before validation.
 */
export const NEPAL_BANK_ACCOUNT_REGEX = /^\d{13,17}$/;

/**
 * 3. Nepal Mobile: +977-9XXXXXXXXX, 9XXXXXXXXX, or 09XXXXXXXXX
 * Covers Ncell (98, 97), NTC (98, 97), Smart (96), UTL (99)
 */
export const NEPAL_PHONE_REGEX = /^(\+977[-\s]?|0)?9[6-9]\d{8}$/;

/**
 * 4. Password: NIST 800-63B Standard
 * Length between 8 and 128 characters.
 */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

// ---------------------------------------------------------
// SCHEMA DEFINITION
// ---------------------------------------------------------

export const registerSchema = z
  .object({
    // --- Full Name ---
    name: z
      .string({ error: "Full name is required" })
      .trim()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must not exceed 100 characters")
      // Ensures single spaces between words and no leading/trailing/multiple spaces
      .regex(/^\S+( \S+)*$/, "Name cannot have leading, trailing, or multiple consecutive spaces"),

    // --- Email Address ---
    email: z
      .string({ error: "Email is required" })
      .trim()
      .toLowerCase()
      .email("Please provide a valid email address")
      .max(255, "Email must not exceed 255 characters"),

    // --- Password (NIST 800-63B) ---
    password: z
      .string({ error: "Password is required" })
      .min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`)
      .max(PASSWORD_MAX, `Password must not exceed ${PASSWORD_MAX} characters`),

    // --- Password Confirmation (UI requirement) ---
    passwordConfirm: z
      .string({ error: "Please confirm your password" }),

    // --- Phone Number (Nepal Mobile) ---
    phoneNumber: z
      .string({ error: "Phone number must be text" })
      .trim()
      .regex(NEPAL_PHONE_REGEX, "Invalid Nepal phone number. Format: 98XXXXXXXX or +977-98XXXXXXXX")
      .optional()
      .or(z.literal("").transform(() => undefined)),

    // --- PAN Number (Nepal IRD) ---
    panNumber: z
      .string({ error: "PAN must be text" })
      .trim()
      .transform((val) => val.replace(/[-\s]/g, ""))
      .pipe(
        z.string().regex(NEPAL_PAN_REGEX, "Invalid PAN. Must be 9 digits (e.g., 600123456)")
      )
      .optional()
      .or(z.literal("").transform(() => undefined)),

    // --- Bank Account Number (Nepal Commercial Banks) ---
    bankAccountNumber: z
      .string({ error: "Account number must be text" })
      .trim()
      .transform((val) => val.replace(/[-\s]/g, ""))
      .pipe(
        z.string().regex(NEPAL_BANK_ACCOUNT_REGEX, "Invalid account number. Must be 13-17 digits.")
      )
      .optional()
      .or(z.literal("").transform(() => ""))
      .default(""),

    // --- SECURITY NOTE: role is REMOVED from payload ---
    // Never accept role from public self-registration.
    // Backend assigns UserRole.member authoritatively.
  })
  // --- Cross-Field Validation: Password Confirmation Match ---
  .refine((data) => data.password === data.passwordConfirm, {
    message: "Passwords do not match",
    path: ["passwordConfirm"],
  })
  // --- Security: Strip unknown fields (e.g. attackers injecting "role": "founder") ---
  .strict();

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------
export type RegisterInput = z.infer<typeof registerSchema>;