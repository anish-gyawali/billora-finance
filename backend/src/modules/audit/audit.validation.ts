import { z } from "zod";

const uuid = z.string().uuid();
const dateTime = z.coerce.date();
const csv = z.string().trim().max(100).optional();
export const auditQuerySchema = z.object({ user_id: uuid.optional(), my: z.coerce.boolean().default(false), entity_type: z.string().trim().max(100).optional(), entity_id: uuid.optional(), action: csv, action_status: z.enum(["success", "failed", "partial"]).optional(), date_from: dateTime.optional(), date_to: dateTime.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict().superRefine((v, c) => { if (v.date_from && v.date_to && v.date_to < v.date_from) c.addIssue({ code: "custom", path: ["date_to"], message: "date_to cannot be before date_from" }); });
export const auditIdSchema = z.object({ id: uuid }).strict();
export const auditEntitySchema = z.object({ type: z.string().trim().min(1).max(100), id: uuid }).strict();
export const auditUserSchema = z.object({ userId: uuid }).strict();
export const auditSummarySchema = z.object({ period: z.enum(["day", "month", "year"]).default("month"), date_from: dateTime.optional(), date_to: dateTime.optional(), entity_type: z.string().trim().max(100).optional() }).strict();
export const auditExportSchema = auditQuerySchema.omit({ page: true, limit: true }).extend({ format: z.enum(["json", "csv"]).default("json") }).strict();
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type AuditSummaryQuery = z.infer<typeof auditSummarySchema>;
export type AuditExportQuery = z.infer<typeof auditExportSchema>;
