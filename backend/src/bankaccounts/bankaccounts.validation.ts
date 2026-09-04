import { z } from "zod";

const uuid = z.string().uuid();
const currencies = ["NPR", "USD", "EUR", "GBP", "INR", "AUD", "CAD", "CHF", "SEK", "NZD"] as const;
const currency = z.string().trim().toUpperCase().refine((value): value is (typeof currencies)[number] => currencies.includes(value as (typeof currencies)[number]), "Unsupported ISO 4217 currency");
const text = (label: string, max = 255) => z.string().trim().min(1, `${label} is required`).max(max, `${label} must be at most ${max} characters`);
const accountNumber = z.string().trim().min(1, "Account number is required").max(50).regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "Account number contains invalid characters");

export const createBankAccountSchema = z.object({
  name: text("Name"),
  bank_name: text("Bank name"),
  account_number: accountNumber,
  currency,
  gl_account_id: uuid,
}).strict();

export const updateBankAccountSchema = z.object({
  name: text("Name").optional(),
  bank_name: text("Bank name").optional(),
  account_number: accountNumber.optional(),
  currency: currency.optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field must be provided for update");

export const bankAccountIdParamSchema = z.object({ id: uuid }).strict();
export const bankAccountQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  bank_name: z.string().trim().max(255).optional(),
  currency: currency.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export type CreateBankAccountInput = z.infer<typeof createBankAccountSchema>;
export type UpdateBankAccountInput = z.infer<typeof updateBankAccountSchema>;
export type BankAccountQuery = z.infer<typeof bankAccountQuerySchema>;
