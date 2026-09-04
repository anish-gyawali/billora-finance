import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format").refine((v) => { const d = new Date(`${v}T00:00:00.000Z`); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v; }, "Invalid calendar date");
const range = z.object({ from: date.optional(), to: date.optional() }).superRefine((v, c) => { if (v.from && v.to && v.to < v.from) c.addIssue({ code: "custom", path: ["to"], message: "to cannot be before from" }); });
export const trialBalanceQuerySchema = range.strict();
export const profitLossQuerySchema = z.object({ from: date, to: date }).strict().superRefine((v, c) => { if (v.to < v.from) c.addIssue({ code: "custom", path: ["to"], message: "to cannot be before from" }); });
export const balanceSheetQuerySchema = z.object({ as_of: date }).strict();
export type TrialBalanceQuery = z.infer<typeof trialBalanceQuerySchema>;
export type ProfitLossQuery = z.infer<typeof profitLossQuerySchema>;
export type BalanceSheetQuery = z.infer<typeof balanceSheetQuerySchema>;
export const toUtcDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
