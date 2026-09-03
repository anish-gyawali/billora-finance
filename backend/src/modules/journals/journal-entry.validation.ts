import { z } from "zod";
import { EntryStatus, SourceType } from "../../generated/prisma/enums.js";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must use YYYY-MM-DD format");
const uuid = z.string().uuid();

const lineSchema = z.object({
  account_id: uuid,
  debit: z.coerce.number().finite().nonnegative().max(99999999999999.99).default(0),
  credit: z.coerce.number().finite().nonnegative().max(99999999999999.99).default(0),
  description: z.string().trim().max(500).optional(),
}).strict().superRefine((line, ctx) => {
  const debitPositive = line.debit > 0;
  const creditPositive = line.credit > 0;
  if (debitPositive === creditPositive) {
    ctx.addIssue({ code: "custom", message: "A line must contain either a positive debit or a positive credit, never both" });
  }
});

export const createJournalEntrySchema = z.object({
  entry_date: dateOnly,
  period_id: uuid,
  source_type: z.nativeEnum(SourceType),
  source_id: uuid.optional().nullable(),
  memo: z.string().trim().max(1000).optional().nullable(),
  lines: z.array(lineSchema).max(500).optional().default([]),
}).strict();

export const updateJournalEntrySchema = z.object({
  entry_date: dateOnly.optional(),
  period_id: uuid.optional(),
  source_type: z.nativeEnum(SourceType).optional(),
  source_id: uuid.optional().nullable(),
  memo: z.string().trim().max(1000).optional().nullable(),
  lines: z.array(lineSchema).max(500).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: "At least one field must be provided for update",
});

export const reverseJournalEntrySchema = z.object({
  entry_date: dateOnly.optional(),
  period_id: uuid.optional(),
  memo: z.string().trim().max(1000).optional().nullable(),
}).strict();

export const journalEntryIdParamSchema = z.object({ id: uuid }).strict();

export const queryJournalEntriesSchema = z.object({
  status: z.nativeEnum(EntryStatus).optional(),
  period_id: uuid.optional(),
  source_type: z.nativeEnum(SourceType).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(50),
}).strict();

export type CreateJournalEntryInput = z.infer<typeof createJournalEntrySchema>;
export type UpdateJournalEntryInput = z.infer<typeof updateJournalEntrySchema>;
export type ReverseJournalEntryInput = z.infer<typeof reverseJournalEntrySchema>;
export type QueryJournalEntriesInput = z.infer<typeof queryJournalEntriesSchema>;
export type JournalLineInput = z.infer<typeof lineSchema>;
