import { z } from "zod";
const uuid = z.string().uuid();
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format").refine((value) => new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value, "Invalid calendar date");
const money = z.coerce.number().finite().nonnegative().max(99999999999999.99);
const itemSchema = z.object({ account_id: uuid, description: z.string().trim().min(1).max(1000), amount: money.refine((value) => value > 0, "Amount must be greater than zero"), vat_amount: money.optional().nullable(), tds_amount: money.optional().nullable() }).strict();

export const createExpenseSchema = z.object({ expense_date: dateOnly, vendor_id: uuid.optional().nullable(), paid_by_user_id: uuid.optional().nullable(), payment_account_id: uuid.optional().nullable(), expense_items: z.array(itemSchema).min(1, "At least one expense item is required").max(500) }).strict();
export const updateExpenseSchema = createExpenseSchema.partial().strict().refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided for update" });
export const expenseIdParamSchema = z.object({ id: uuid }).strict();
export const queryExpensesSchema = z.object({ status: z.enum(["draft", "approved", "posted", "reversed"]).optional(), vendor_id: uuid.optional(), expense_date_from: dateOnly.optional(), expense_date_to: dateOnly.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict().superRefine((data, ctx) => { if (data.expense_date_from && data.expense_date_to && data.expense_date_to < data.expense_date_from) ctx.addIssue({ code: "custom", path: ["expense_date_to"], message: "End date cannot be before start date" }); });
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;
export type QueryExpensesInput = z.infer<typeof queryExpensesSchema>;
