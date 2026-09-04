import { z } from "zod";
import { InvoiceStatus, PaymentMethod } from "../../generated/prisma/enums.js";

const uuid = z.string().uuid("Must be a valid UUID");
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format").refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return parsed.toISOString().slice(0, 10) === value;
}, "Invalid calendar date");
const money = z.coerce.number().finite().nonnegative().max(99999999999999.99);

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1).max(1000),
  quantity: z.coerce.number().int().positive().max(1000000),
  rate: money,
  vat_amount: money.optional().nullable(),
}).strict();

const invoiceDatesAndCurrency = (raw: unknown, ctx: z.RefinementCtx) => {
  const data = raw as { invoice_date?: string; due_date?: string; currency?: string; exchange_rate_to_npr?: number | null | undefined };
  if (data.invoice_date && data.due_date && data.due_date < data.invoice_date) {
    ctx.addIssue({ code: "custom", path: ["due_date"], message: "Due date cannot be before invoice date" });
  }
  if (data.currency === "NPR" && data.exchange_rate_to_npr != null) {
    ctx.addIssue({ code: "custom", path: ["exchange_rate_to_npr"], message: "NPR invoices must not have an exchange rate" });
  }
  if (data.currency === "USD" && (data.exchange_rate_to_npr == null || data.exchange_rate_to_npr <= 0)) {
    ctx.addIssue({ code: "custom", path: ["exchange_rate_to_npr"], message: "USD invoices require an exchange rate greater than zero" });
  }
};

export const createInvoiceSchema = z.object({
  client_id: uuid,
  invoice_date: dateOnly,
  due_date: dateOnly,
  currency: z.enum(["NPR", "USD"]),
  exchange_rate_to_npr: money.optional().nullable(),
  invoice_items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required").max(500),
}).strict().superRefine(invoiceDatesAndCurrency);

export const updateInvoiceSchema = z.object({
  invoice_date: dateOnly.optional(),
  due_date: dateOnly.optional(),
  currency: z.enum(["NPR", "USD"]).optional(),
  exchange_rate_to_npr: money.optional().nullable(),
  invoice_items: z.array(invoiceItemSchema).min(1, "At least one invoice item is required").max(500).optional(),
}).strict().superRefine(invoiceDatesAndCurrency).refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided for update",
});

export const invoiceIdParamSchema = z.object({ id: uuid }).strict();

export const queryInvoicesSchema = z.object({
  client_id: uuid.optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  currency: z.enum(["NPR", "USD"]).optional(),
  invoice_date_from: dateOnly.optional(),
  invoice_date_to: dateOnly.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict().superRefine((data, ctx) => {
  if (data.invoice_date_from && data.invoice_date_to && data.invoice_date_to < data.invoice_date_from) {
    ctx.addIssue({ code: "custom", path: ["invoice_date_to"], message: "End date cannot be before start date" });
  }
});

export const createPaymentSchema = z.object({
  amount: money.refine((value) => value > 0, "Payment amount must be greater than zero"),
  currency: z.enum(["NPR", "USD"]),
  payment_date: dateOnly,
  account_id: uuid,
  method: z.nativeEnum(PaymentMethod),
  actual_npr_amount: money.optional().nullable(),
}).strict();

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type QueryInvoicesInput = z.infer<typeof queryInvoicesSchema>;
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
