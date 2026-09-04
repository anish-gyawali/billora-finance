import { z } from "zod";

// ---------------------------------------------------------
// REGEX & CONSTANTS
// ---------------------------------------------------------

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const NEPAL_PAN_REGEX = /^\d{9}$/;

// ---------------------------------------------------------
// SCHEMAS DEFINITION
// ---------------------------------------------------------

/**
 * Zod schema for creating a new Client
 * Supports both Nepal and International clients
 */
export const createClientSchema = z
  .object({
    name: z
      .string({ error: "Client name is required" })
      .trim()
      .min(1, "Client name cannot be empty")
      .max(255, "Client name must not exceed 255 characters"),

    country: z
      .string({ error: "Country is required" })
      .trim()
      .min(1, "Country cannot be empty")
      .max(100, "Country name must not exceed 100 characters"),

    pan_number: z
      .string()
      .trim()
      .max(50, "PAN number must not exceed 50 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" || val === undefined ? null : val)),

    billing_email: z
      .string({ error: "Billing email is required" })
      .trim()
      .toLowerCase()
      .regex(EMAIL_REGEX, "Please provide a valid email address")
      .max(255, "Billing email must not exceed 255 characters"),

    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO currency code (e.g. USD, NPR)")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const isNepal =
      data.country.toLowerCase() === "nepal" ||
      data.country.toLowerCase() === "np";

    // For Nepal clients, if PAN is provided, validate 9-digit format
    if (isNepal && data.pan_number) {
      if (!NEPAL_PAN_REGEX.test(data.pan_number)) {
        ctx.addIssue({
          code: "custom",
          message: "Nepal PAN number must be exactly 9 digits",
          path: ["pan_number"],
        });
      }
    }
  });

/**
 * Zod schema for updating an existing Client
 */
export const updateClientSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Client name cannot be empty")
      .max(255, "Client name must not exceed 255 characters")
      .optional(),

    country: z
      .string()
      .trim()
      .min(1, "Country cannot be empty")
      .max(100, "Country name must not exceed 100 characters")
      .optional(),

    pan_number: z
      .string()
      .trim()
      .max(50, "PAN number must not exceed 50 characters")
      .nullable()
      .optional()
      .transform((val) => (val === "" ? null : val)),

    billing_email: z
      .string()
      .trim()
      .toLowerCase()
      .regex(EMAIL_REGEX, "Please provide a valid email address")
      .max(255, "Billing email must not exceed 255 characters")
      .optional(),

    currency: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{3}$/, "Currency must be a three-letter ISO currency code")
      .optional(),
  })
  .strict()

/**
 * Schema for route param validation (:id)
 */
export const clientIdParamSchema = z
  .object({
    id: z.string().uuid("Invalid client ID format. Must be a valid UUID"),
  })
  .strict();

/**
 * Schema for filtering and pagination query params
 */
export const queryClientsSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().optional(),
    country: z.string().trim().optional(),
    currency: z.string().trim().toUpperCase().optional(),
    sortBy: z
      .enum(["created_at", "updated_at", "name", "country", "currency"])
      .default("created_at"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict();

// ---------------------------------------------------------
// INFERRED TYPES
// ---------------------------------------------------------

export type CreateClientInput = z.infer<typeof createClientSchema>;
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
export type ClientIdParam = z.infer<typeof clientIdParamSchema>;
export type QueryClientsInput = z.infer<typeof queryClientsSchema>;
