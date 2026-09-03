import type { Prisma } from "../../generated/prisma/client.js";
import type { JournalEntry, AccountingPeriod } from "../../generated/prisma/client.js";
import type { EntryStatus, SourceType } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import { logger } from "../../config/logger.js";
import type { JournalLineInput } from "./journal-entry.validation.js";

export type JournalEntryWithLines = Prisma.JournalEntryGetPayload<{ include: { lines: true; reversal_entries: { select: { id: true } } } }>;
export interface JournalEntryFilter { status?: EntryStatus | undefined; period_id?: string | undefined; source_type?: SourceType | undefined; page?: number | undefined; page_size?: number | undefined; }
export interface JournalEntryListResult { items: JournalEntryWithLines[]; total: number; page: number; page_size: number; }
export interface PeriodSummary { id: string; period_start: Date; period_end: Date; status: "open" | "closed"; }
export interface JournalEntryAudit { user_id: string | undefined; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown>; }

export interface IJournalEntryRepository {
  findAll(filter?: JournalEntryFilter): Promise<JournalEntryListResult>;
  findById(id: string): Promise<JournalEntryWithLines | null>;
  findPeriod(id: string): Promise<AccountingPeriod | null>;
  countActiveAccounts(ids: string[]): Promise<number>;
  create(data: { entry_date: Date; period_id: string; source_type: SourceType; source_id?: string | null | undefined; memo?: string | null | undefined; created_by: string; lines: JournalLineInput[] }): Promise<JournalEntryWithLines>;
  updateDraft(id: string, data: { entry_date?: Date | undefined; period_id?: string | undefined; source_type?: SourceType | undefined; source_id?: string | null | undefined; memo?: string | null | undefined; lines?: JournalLineInput[] | undefined }): Promise<JournalEntryWithLines>;
  post(id: string): Promise<JournalEntryWithLines>;
  createReversal(data: { original: JournalEntryWithLines; entry_date: Date; period_id: string; memo: string | null; created_by: string }): Promise<JournalEntryWithLines>;
  recordAudit(input: JournalEntryAudit): Promise<void>;
}

const lineData = (line: JournalLineInput) => ({ account_id: line.account_id, debit: line.debit, credit: line.credit, description: line.description ?? null });
const include = { lines: true, reversal_entries: { select: { id: true } } } as const;

export class JournalEntryRepository implements IJournalEntryRepository {
  async findAll(filter?: JournalEntryFilter): Promise<JournalEntryListResult> {
    try {
      const page = filter?.page ?? 1; const pageSize = filter?.page_size ?? 50;
      const where: Prisma.JournalEntryWhereInput = { ...(filter?.status ? { status: filter.status } : {}), ...(filter?.period_id ? { period_id: filter.period_id } : {}), ...(filter?.source_type ? { source_type: filter.source_type } : {}) };
      const [items, total] = await prisma.$transaction([
        prisma.journalEntry.findMany({ where, include, orderBy: [{ entry_date: "desc" }, { created_at: "desc" }], skip: (page - 1) * pageSize, take: pageSize }),
        prisma.journalEntry.count({ where }),
      ]);
      return { items, total, page, page_size: pageSize };
    } catch (error) { logger.error({ err: error, filter }, "Failed to fetch journal entries"); throw new InternalServerError("Failed to retrieve journal entries"); }
  }

  async findById(id: string): Promise<JournalEntryWithLines | null> {
    try { return await prisma.journalEntry.findUnique({ where: { id }, include }); }
    catch (error) { logger.error({ err: error, entryId: id }, "Failed to find journal entry"); throw new InternalServerError("Failed to query journal entry"); }
  }

  async findPeriod(id: string): Promise<AccountingPeriod | null> {
    try { return await prisma.accountingPeriod.findUnique({ where: { id } }); }
    catch (error) { logger.error({ err: error, periodId: id }, "Failed to find accounting period"); throw new InternalServerError("Failed to query accounting period"); }
  }

  async countActiveAccounts(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    try { return await prisma.account.count({ where: { id: { in: ids }, is_active: true } }); }
    catch (error) { logger.error({ err: error }, "Failed to validate journal accounts"); throw new InternalServerError("Failed to validate journal accounts"); }
  }

  async create(data: { entry_date: Date; period_id: string; source_type: SourceType; source_id?: string | null | undefined; memo?: string | null | undefined; created_by: string; lines: JournalLineInput[] }): Promise<JournalEntryWithLines> {
    try {
      return await prisma.journalEntry.create({ data: { entry_date: data.entry_date, period_id: data.period_id, source_type: data.source_type, source_id: data.source_id ?? null, memo: data.memo ?? null, created_by: data.created_by, lines: { create: data.lines.map(lineData) } }, include });
    } catch (error) { logger.error({ err: error }, "Failed to create journal entry"); throw new InternalServerError("Failed to create journal entry"); }
  }

  async updateDraft(id: string, data: { entry_date?: Date | undefined; period_id?: string | undefined; source_type?: SourceType | undefined; source_id?: string | null | undefined; memo?: string | null | undefined; lines?: JournalLineInput[] | undefined }): Promise<JournalEntryWithLines> {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.journalEntry.findUnique({ where: { id }, select: { status: true } });
        if (!current) throw new NotFoundError(`Journal entry with ID '${id}' not found`);
        if (current.status !== "draft") throw new ConflictError("Only draft journal entries can be edited");
        if (data.lines !== undefined) {
          await tx.journalLine.deleteMany({ where: { journal_entry_id: id } });
        }
        return tx.journalEntry.update({ where: { id }, data: { ...(data.entry_date !== undefined ? { entry_date: data.entry_date } : {}), ...(data.period_id !== undefined ? { period_id: data.period_id } : {}), ...(data.source_type !== undefined ? { source_type: data.source_type } : {}), ...(data.source_id !== undefined ? { source_id: data.source_id } : {}), ...(data.memo !== undefined ? { memo: data.memo } : {}), ...(data.lines !== undefined ? { lines: { create: data.lines.map(lineData) } } : {}) }, include });
      });
    } catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, entryId: id }, "Failed to update journal entry"); throw new InternalServerError("Failed to update journal entry"); }
  }

  async post(id: string): Promise<JournalEntryWithLines> {
    try { return await prisma.journalEntry.update({ where: { id, status: "draft" }, data: { status: "posted" }, include }); }
    catch (error) { if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025") throw new ConflictError("Only an existing draft journal entry can be posted"); logger.error({ err: error, entryId: id }, "Failed to post journal entry"); throw new InternalServerError("Failed to post journal entry"); }
  }

  async createReversal(data: { original: JournalEntryWithLines; entry_date: Date; period_id: string; memo: string | null; created_by: string }): Promise<JournalEntryWithLines> {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.journalEntry.update({ where: { id: data.original.id, status: "posted" }, data: { status: "reversed" } });
        return tx.journalEntry.create({ data: { entry_date: data.entry_date, period_id: data.period_id, status: "posted", source_type: "reversal", source_id: data.original.id, reversed_entry_id: data.original.id, memo: data.memo, created_by: data.created_by, lines: { create: data.original.lines.map((line) => ({ account_id: line.account_id, debit: line.credit, credit: line.debit, description: line.description })) } }, include });
      });
    }
    catch (error) { logger.error({ err: error, entryId: data.original.id }, "Failed to create journal reversal"); throw new InternalServerError("Failed to create journal reversal"); }
  }

  async recordAudit(input: JournalEntryAudit): Promise<void> {
    try { const data: Prisma.AuditLogCreateInput = { user_id: input.user_id ?? null, action: input.action, entity_type: "JournalEntry", entity_id: input.entity_id }; if (input.old_value) data.old_value = input.old_value as Prisma.InputJsonValue; if (input.new_value) data.new_value = input.new_value as Prisma.InputJsonValue; await prisma.auditLog.create({ data }); }
    catch (error) { logger.error({ err: error, entryId: input.entity_id, action: input.action }, "Failed to write journal audit log"); }
  }
}

export const journalEntryRepository = new JournalEntryRepository();
