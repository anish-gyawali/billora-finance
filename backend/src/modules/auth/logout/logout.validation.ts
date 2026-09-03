import { z } from "zod";

// ---------------------------------------------------------
// Constants
// ---------------------------------------------------------

/**
 * 1. No input fields required for logout (just authentication)
 *    - Relies on authenticated session/cookie
 */

/**
 * 2. Security: Strip unknown fields
 */
// Use preprocess so a completely empty body (undefined) is treated as {}
// This allows logout to be called with cookies only and no JSON body.
export const logoutSchema = z.preprocess(
  (val) => (val === undefined || val === null ? {} : val),
  z
    .object({
      // --- Optional CSRF token for additional security ---
      csrfToken: z.string().optional(),
    })
    .strict()
);

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

export type LogoutInput = z.infer<typeof logoutSchema>;