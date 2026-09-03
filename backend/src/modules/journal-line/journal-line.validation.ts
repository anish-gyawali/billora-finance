import { z } from "zod";

const amount = z.coerce.number().finite().nonnegative().max(99999999999999.99);

export const journalLineAmountFields = {
  debit: amount.default(0),
  credit: amount.default(0),
};

export const createJournalLineSchema = z.object({
  journal_entry_id: z.string().uuid("Invalid journal entry ID"),
  account_id: z.string().uuid("Invalid account ID"),
  ...journalLineAmountFields,
  description: z.string().trim().max(500).optional().nullable(),
}).strict().superRefine((value, ctx) => {
  if ((value.debit > 0) === (value.credit > 0)) {
    ctx.addIssue({ code: "custom", path: ["debit"], message: "Exactly one of debit or credit must be greater than zero" });
  }
});

export const updateJournalLineSchema = z.object({
  account_id: z.string().uuid("Invalid account ID").optional(),
  debit: amount.optional(),
  credit: amount.optional(),
  description: z.string().trim().max(500).optional().nullable(),
}).strict().refine((value) => Object.keys(value).length > 0, "At least one field must be provided for update");

export const journalLineIdParamSchema = z.object({ id: z.string().uuid("Invalid journal line ID") }).strict();

export type CreateJournalLineInput = z.infer<typeof createJournalLineSchema>;
export type UpdateJournalLineInput = z.infer<typeof updateJournalLineSchema>;
