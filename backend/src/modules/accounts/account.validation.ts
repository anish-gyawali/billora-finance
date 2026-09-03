import { z } from "zod";
import { AccountType, NormalBalance } from "../../generated/prisma/enums.js";

// ---------------------------------------------------------
// CONSTANTS & REGEX
// ---------------------------------------------------------

/**
 * GL Account code: 1 to 10 characters alphanumeric (e.g. 1010, 4010, 5020, 1020-01)
 */
export const ACCOUNT_CODE_REGEX = /^[A-Z0-9]+(?:[.-][A-Z0-9]+)*$/;

// ---------------------------------------------------------
// VALIDATION SCHEMAS
// ---------------------------------------------------------

/**
 * Schema for creating a new General Ledger account
 */
export const createAccountSchema = z
  .object({
    code: z
      .string({ error: "Account code is required" })
      .trim()
      .toUpperCase()
      .min(1, "Account code must be at least 1 character")
      .max(10, "Account code must not exceed 10 characters")
      .regex(ACCOUNT_CODE_REGEX, "Account code must contain alphanumeric segments separated by dots or hyphens"),

    name: z
      .string({ error: "Account name is required" })
      .trim()
      .toUpperCase()
      .min(2, "Account name must be at least 2 characters")
      .max(100, "Account name must not exceed 100 characters"),

    type: z.nativeEnum(AccountType, {
      error: "Invalid account type. Allowed: asset, liability, equity, revenue, expense",
    }),

    parent_id: z
      .string({ error: "Parent ID must be a valid UUID" })
      .uuid("Parent ID must be a valid UUID")
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),

    normal_balance: z
      .nativeEnum(NormalBalance, {
        error: "Invalid normal balance. Allowed: debit, credit",
      })
      .optional(),

    is_active: z.boolean().optional().default(true),
  })
  .strict();

/**
 * Schema for updating an existing General Ledger account
 */
export const updateAccountSchema = z
  .object({
    code: z
      .string({ error: "Account code must be text" })
      .trim()
      .min(1, "Account code must be at least 1 character")
      .max(10, "Account code must not exceed 10 characters")
      .regex(ACCOUNT_CODE_REGEX, "Account code must contain alphanumeric segments separated by dots or hyphens")
      .optional(),

    name: z
      .string({ error: "Account name must be text" })
      .trim()
      .min(2, "Account name must be at least 2 characters")
      .max(100, "Account name must not exceed 100 characters")
      .optional(),

    type: z
      .nativeEnum(AccountType, {
        error: "Invalid account type. Allowed: asset, liability, equity, revenue, expense",
      })
      .optional(),

    parent_id: z
      .string({ error: "Parent ID must be a valid UUID" })
      .uuid("Parent ID must be a valid UUID")
      .nullable()
      .optional()
      .or(z.literal("").transform(() => null)),

    normal_balance: z
      .nativeEnum(NormalBalance, {
        error: "Invalid normal balance. Allowed: debit, credit",
      })
      .optional(),

    is_active: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Schema for validating route parameter :id (UUID)
 */
export const accountIdParamSchema = z
  .object({
    id: z.string({ error: "Account ID is required" }).uuid("Invalid account ID format. Must be a valid UUID"),
  })
  .strict();

/**
 * Schema for filtering / querying Chart of Accounts
 */
export const queryAccountsSchema = z
  .object({
    type: z
      .nativeEnum(AccountType, {
        error: "Invalid account type filter",
      })
      .optional(),

    is_active: z.enum(["true", "false"]).transform((value) => value === "true").optional(),

    search: z.string().trim().max(100, "Search must not exceed 100 characters").optional(),

    parent_id: z
      .string()
      .uuid("Parent ID must be a valid UUID")
      .nullable()
      .optional()
      .or(z.literal("").transform(() => undefined)),

    page: z.coerce.number().int().min(1).optional().default(1),
    page_size: z.coerce.number().int().min(1).max(100).optional().default(50),
  })
  .strict();

// ---------------------------------------------------------
// TYPES
// ---------------------------------------------------------

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type AccountIdParam = z.infer<typeof accountIdParamSchema>;
export type QueryAccountsInput = z.infer<typeof queryAccountsSchema>;
