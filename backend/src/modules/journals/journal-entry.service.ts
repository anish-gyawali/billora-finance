import { Prisma } from "../../generated/prisma/client.js";
import type { JournalEntryWithLines, IJournalEntryRepository } from "./journal-entry.repository.js";
import { journalEntryRepository } from "./journal-entry.repository.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import type { CreateJournalEntryInput, UpdateJournalEntryInput, ReverseJournalEntryInput, QueryJournalEntriesInput } from "./journal-entry.validation.js";

const toDate = (value: string): Date => new Date(`${value}T00:00:00.000Z`);
const dateInPeriod = (date: Date, start: Date, end: Date) => date >= start && date <= end;
const decimal = (value: number | Prisma.Decimal) => new Prisma.Decimal(value);

export class JournalEntryService {
  constructor(private readonly repo: IJournalEntryRepository = journalEntryRepository) {}

  list(input?: QueryJournalEntriesInput) { return this.repo.findAll(input); }

  async get(id: string): Promise<JournalEntryWithLines> {
    const entry = await this.repo.findById(id);
    if (!entry) throw new NotFoundError(`Journal entry with ID '${id}' not found`);
    return entry;
  }

  private async validatePeriod(periodId: string, entryDate: Date) {
    const period = await this.repo.findPeriod(periodId);
    if (!period) throw new BadRequestError(`Accounting period with ID '${periodId}' does not exist`);
    if (period.status !== "open") throw new ConflictError("Journal entries can only use an open accounting period");
    if (!dateInPeriod(entryDate, period.period_start, period.period_end)) throw new BadRequestError("Entry date must belong to the selected accounting period");
  }

  private async validateAccounts(lines: CreateJournalEntryInput["lines"]) {
    const ids = [...new Set(lines.map((line) => line.account_id))];
    if (await this.repo.countActiveAccounts(ids) !== ids.length) throw new BadRequestError("Every journal line must reference an existing active account");
  }

  private validateBalance(lines: JournalEntryWithLines["lines"]) {
    if (lines.length < 2) throw new BadRequestError("A journal entry must contain at least two lines before posting");
    let debit = new Prisma.Decimal(0); let credit = new Prisma.Decimal(0);
    for (const line of lines) { debit = debit.plus(decimal(line.debit)); credit = credit.plus(decimal(line.credit)); }
    if (debit.isZero() || !debit.eq(credit)) throw new BadRequestError("Total debit must equal total credit and be greater than zero");
  }

  async create(input: CreateJournalEntryInput, actorId: string): Promise<JournalEntryWithLines> {
    const date = toDate(input.entry_date);
    await this.validatePeriod(input.period_id, date);
    await this.validateAccounts(input.lines);
    const entry = await this.repo.create({ entry_date: date, period_id: input.period_id, source_type: input.source_type, source_id: input.source_id ?? null, memo: input.memo ?? null, created_by: actorId, lines: input.lines });
    await this.repo.recordAudit({ user_id: actorId, action: "JOURNAL_ENTRY_CREATED", entity_id: entry.id, new_value: { status: entry.status, period_id: entry.period_id, source_type: entry.source_type } });
    return entry;
  }

  async update(id: string, input: UpdateJournalEntryInput, actorId: string): Promise<JournalEntryWithLines> {
    const current = await this.get(id);
    if (current.status !== "draft") throw new ConflictError("Only draft journal entries can be edited");
    const periodId = input.period_id ?? current.period_id;
    const date = input.entry_date ? toDate(input.entry_date) : current.entry_date;
    await this.validatePeriod(periodId, date);
    if (input.lines !== undefined) await this.validateAccounts(input.lines);
    const entry = await this.repo.updateDraft(id, {
      ...(input.entry_date !== undefined ? { entry_date: date } : {}),
      ...(input.period_id !== undefined ? { period_id: periodId } : {}),
      ...(input.source_type !== undefined ? { source_type: input.source_type } : {}),
      ...(input.source_id !== undefined ? { source_id: input.source_id } : {}),
      ...(input.memo !== undefined ? { memo: input.memo } : {}),
      ...(input.lines !== undefined ? { lines: input.lines } : {}),
    });
    await this.repo.recordAudit({ user_id: actorId, action: "JOURNAL_ENTRY_UPDATED", entity_id: id, old_value: { status: current.status }, new_value: { status: entry.status, period_id: entry.period_id } });
    return entry;
  }

  async post(id: string, actorId: string): Promise<JournalEntryWithLines> {
    const current = await this.get(id);
    if (current.status !== "draft") throw new ConflictError("Only draft journal entries can be posted");
    await this.validatePeriod(current.period_id, current.entry_date);
    this.validateBalance(current.lines);
    const entry = await this.repo.post(id);
    await this.repo.recordAudit({ user_id: actorId, action: "JOURNAL_ENTRY_POSTED", entity_id: id, old_value: { status: "draft" }, new_value: { status: "posted" } });
    return entry;
  }

  async reverse(id: string, input: ReverseJournalEntryInput, actorId: string): Promise<JournalEntryWithLines> {
    const original = await this.get(id);
    if (original.status !== "posted") throw new ConflictError("Only posted journal entries can be reversed");
    if (original.reversed_entry_id || original.reversal_entries.length > 0) throw new ConflictError("This journal entry has already been reversed");
    const periodId = input.period_id ?? original.period_id;
    const entryDate = input.entry_date ? toDate(input.entry_date) : original.entry_date;
    await this.validatePeriod(periodId, entryDate);
    const reversal = await this.repo.createReversal({ original, entry_date: entryDate, period_id: periodId, memo: input.memo ?? `Reversal of journal entry ${original.id}`, created_by: actorId });
    await this.repo.recordAudit({ user_id: actorId, action: "JOURNAL_ENTRY_REVERSED", entity_id: reversal.id, new_value: { status: reversal.status, reversed_entry_id: original.id } });
    return reversal;
  }
}

export const journalEntryService = new JournalEntryService();
