import { z } from "zod";
const money = z.coerce.number().finite().nonnegative().max(99999999999999.99);
const uuid = z.string().uuid();
export const createSalaryItemSchema = z.object({ user_id: uuid, gross_amount: money, tds_amount: money.optional().default(0) }).strict();
export const updateSalaryItemSchema = z.object({ gross_amount: money.optional(), tds_amount: money.optional() }).strict().refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided for update" });
export type CreateSalaryItemInput = z.infer<typeof createSalaryItemSchema>;
export type UpdateSalaryItemInput = z.infer<typeof updateSalaryItemSchema>;
