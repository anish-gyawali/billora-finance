import { Prisma } from "../../generated/prisma/client.js";

export interface JournalPostingLine { account_id: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal; description?: string | null; }

export async function postJournalEntry(tx: Prisma.TransactionClient, input: { entry_date: Date; period_id: string; source_type: "expense" | "invoice" | "payment" | "salary_run" | "manual" | "reversal"; source_id: string; created_by: string; lines: JournalPostingLine[]; memo?: string | null }) {
  let debit = new Prisma.Decimal(0); let credit = new Prisma.Decimal(0);
  for (const line of input.lines) { debit = debit.plus(line.debit ?? 0); credit = credit.plus(line.credit ?? 0); }
  if (input.lines.length < 2 || debit.isZero() || !debit.eq(credit)) throw new Error("Journal entry is not balanced");
  return tx.journalEntry.create({ data: { entry_date: input.entry_date, period_id: input.period_id, source_type: input.source_type, source_id: input.source_id, created_by: input.created_by, status: "posted", memo: input.memo ?? null, lines: { create: input.lines.map((line) => ({ account_id: line.account_id, debit: line.debit ?? new Prisma.Decimal(0), credit: line.credit ?? new Prisma.Decimal(0), description: line.description ?? null })) } }, include: { lines: true } });
}
