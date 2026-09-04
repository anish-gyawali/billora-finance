import { z } from "zod";
import { PaymentMethod, PaymentDirection } from "../../generated/prisma/enums.js";

const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format").refine((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, "Invalid calendar date");
const amount = z.coerce.number().finite().positive().max(99999999999999.99);
const actualNpr = z.coerce.number().finite().nonnegative().max(99999999999999.99);
const allocationType = z.enum(["invoice", "vendor_expense", "salary_run", "direct"]);

const paymentFields = z.object({
  direction: z.nativeEnum(PaymentDirection),
  amount,
  currency: z.enum(["NPR", "USD"]),
  payment_date: dateOnly,
  account_id: uuid,
  method: z.nativeEnum(PaymentMethod),
  allocated_to_type: allocationType,
  allocated_to_id: uuid.nullable().optional(),
  journal_entry_id: uuid.nullable().optional(),
  actual_npr_amount: actualNpr.nullable().optional(),
}).strict();

export const createPaymentSchema = paymentFields.superRefine((data, ctx) => {
  if (data.allocated_to_type === "direct" && data.allocated_to_id) ctx.addIssue({ code: "custom", path: ["allocated_to_id"], message: "Direct payments must not have an allocation ID" });
  if (data.allocated_to_type !== "direct" && !data.allocated_to_id) ctx.addIssue({ code: "custom", path: ["allocated_to_id"], message: "An allocation ID is required" });
});

export const updatePaymentSchema = z.object({
  direction: z.nativeEnum(PaymentDirection).optional(),
  amount: amount.optional(),
  currency: z.enum(["NPR", "USD"]).optional(),
  payment_date: dateOnly.optional(),
  account_id: uuid.optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  allocated_to_type: allocationType.optional(),
  allocated_to_id: uuid.nullable().optional(),
  actual_npr_amount: actualNpr.nullable().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided for update" });
export const paymentIdParamSchema = z.object({ id: uuid }).strict();
export const queryPaymentsSchema = z.object({
  direction: z.nativeEnum(PaymentDirection).optional(),
  currency: z.enum(["NPR", "USD"]).optional(),
  account_id: uuid.optional(),
  method: z.nativeEnum(PaymentMethod).optional(),
  allocated_to_type: allocationType.optional(),
  allocated_to_id: uuid.optional(),
  payment_date_from: dateOnly.optional(),
  payment_date_to: dateOnly.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().superRefine((data, ctx) => { if (data.payment_date_from && data.payment_date_to && data.payment_date_to < data.payment_date_from) ctx.addIssue({ code: "custom", path: ["payment_date_to"], message: "End date cannot be before start date" }); });

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
export type QueryPaymentsInput = z.infer<typeof queryPaymentsSchema>;
