import { z } from "zod";
import { TaxType } from "../../generated/prisma/enums.js";

const uuid = z.string().uuid();
const dateTime = z.coerce.date();
const rate = z.coerce.number().finite().min(0).max(100).refine((value) => Number.isInteger(value * 100), "Rate must have at most 2 decimal places");
export const createTaxRuleSchema = z.object({ tax_type: z.nativeEnum(TaxType), rate, effective_from: dateTime, effective_to: dateTime.nullable().optional(), notes: z.string().trim().max(1000).nullable().optional() }).strict().superRefine((value, ctx) => { if (value.effective_to && value.effective_to < value.effective_from) ctx.addIssue({ code: "custom", path: ["effective_to"], message: "effective_to must be after or equal to effective_from" }); });
export const updateTaxRuleSchema = z.object({ rate: rate.optional(), effective_to: dateTime.nullable().optional(), notes: z.string().trim().max(1000).nullable().optional(), verified_by_accountant: z.boolean().optional() }).strict().refine((value) => Object.keys(value).length > 0, "At least one field must be provided for update");
export const verifyTaxRuleSchema = z.object({ verified: z.boolean(), verification_notes: z.string().trim().max(1000).optional() }).strict();
export const taxRuleIdSchema = z.object({ id: uuid }).strict();
export const taxTypeParamSchema = z.object({ tax_type: z.nativeEnum(TaxType) }).strict();
export const taxRuleQuerySchema = z.object({ tax_type: z.nativeEnum(TaxType).optional(), include_inactive: z.coerce.boolean().default(false), verified_only: z.coerce.boolean().default(false), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }).strict();
export const applicableQuerySchema = z.object({ tax_type: z.nativeEnum(TaxType), date: dateTime }).strict();
export type CreateTaxRuleInput = z.infer<typeof createTaxRuleSchema>;
export type UpdateTaxRuleInput = z.infer<typeof updateTaxRuleSchema>;
export type VerifyTaxRuleInput = z.infer<typeof verifyTaxRuleSchema>;
export type TaxRuleQuery = z.infer<typeof taxRuleQuerySchema>;
export type ApplicableQuery = z.infer<typeof applicableQuerySchema>;
