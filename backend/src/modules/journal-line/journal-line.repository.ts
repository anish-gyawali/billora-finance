import { Prisma, type JournalLine } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { BadRequestError, ConflictError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import { logger } from "../../config/logger.js";
import type { CreateJournalLineInput, UpdateJournalLineInput } from "./journal-line.validation.js";

export type JournalLineWithContext = Prisma.JournalLineGetPayload<{
  include: { journal_entry: { select: { id: true; status: true } }; account: true };
}>;

export interface IJournalLineRepository {
  findById(id: string): Promise<JournalLineWithContext | null>;
  create(input: CreateJournalLineInput, actorId: string): Promise<JournalLineWithContext>;
  update(id: string, input: UpdateJournalLineInput, actorId: string): Promise<JournalLineWithContext>;
  remove(id: string, actorId: string): Promise<JournalLine>;
}

const include = { journal_entry: { select: { id: true, status: true } }, account: true } as const;

export class JournalLineRepository implements IJournalLineRepository {
  async findById(id: string): Promise<JournalLineWithContext | null> {
    try { return await prisma.journalLine.findUnique({ where: { id }, include }); }
    catch (error) { logger.error({ err: error, lineId: id }, "Failed to find journal line"); throw new InternalServerError("Failed to query journal line"); }
  }

  async create(input: CreateJournalLineInput, actorId: string): Promise<JournalLineWithContext> {
    try {
      return await prisma.$transaction(async (tx) => {
        const entry = await tx.journalEntry.findUnique({ where: { id: input.journal_entry_id }, select: { id: true, status: true } });
        if (!entry) throw new NotFoundError(`Journal entry with ID '${input.journal_entry_id}' not found`);
        if (entry.status !== "draft") throw new ConflictError("Journal lines can only be added to draft journal entries");
        const account = await tx.account.findUnique({ where: { id: input.account_id }, select: { id: true, is_active: true } });
        if (!account) throw new NotFoundError(`Account with ID '${input.account_id}' not found`);
        if (!account.is_active) throw new BadRequestError("Cannot use an inactive account for a journal line");
        const line = await tx.journalLine.create({ data: { journal_entry_id: input.journal_entry_id, account_id: input.account_id, debit: input.debit, credit: input.credit, description: input.description ?? null }, include });
        await tx.auditLog.create({ data: { user_id: actorId, action: "JOURNAL_LINE_CREATED", entity_type: "JournalLine", entity_id: line.id, new_value: { journal_entry_id: line.journal_entry_id, account_id: line.account_id, debit: input.debit, credit: input.credit } } });
        return line;
      });
    } catch (error) { if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError) throw error; logger.error({ err: error, entryId: input.journal_entry_id }, "Failed to create journal line"); throw new InternalServerError("Failed to create journal line"); }
  }

  async update(id: string, input: UpdateJournalLineInput, actorId: string): Promise<JournalLineWithContext> {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.journalLine.findUnique({ where: { id }, include: { journal_entry: { select: { id: true, status: true } }, account: true } });
        if (!current) throw new NotFoundError(`Journal line with ID '${id}' not found`);
        if (current.journal_entry.status !== "draft") throw new ConflictError("Only lines belonging to draft journal entries can be edited");
        if (input.account_id !== undefined) {
          const account = await tx.account.findUnique({ where: { id: input.account_id }, select: { is_active: true } });
          if (!account) throw new NotFoundError(`Account with ID '${input.account_id}' not found`);
          if (!account.is_active) throw new BadRequestError("Cannot use an inactive account for a journal line");
        }
        const debit = input.debit !== undefined ? new Prisma.Decimal(input.debit) : current.debit;
        const credit = input.credit !== undefined ? new Prisma.Decimal(input.credit) : current.credit;
        if (debit.gt(0) === credit.gt(0)) throw new BadRequestError("Exactly one of debit or credit must be greater than zero");
        const line = await tx.journalLine.update({ where: { id }, data: { ...(input.account_id !== undefined ? { account_id: input.account_id } : {}), ...(input.debit !== undefined ? { debit: input.debit } : {}), ...(input.credit !== undefined ? { credit: input.credit } : {}), ...(input.description !== undefined ? { description: input.description } : {}) }, include });
        await tx.auditLog.create({ data: { user_id: actorId, action: "JOURNAL_LINE_UPDATED", entity_type: "JournalLine", entity_id: id, old_value: { account_id: current.account_id, debit: current.debit.toString(), credit: current.credit.toString() }, new_value: { account_id: line.account_id, debit: line.debit.toString(), credit: line.credit.toString() } } });
        return line;
      });
    } catch (error) { if (error instanceof NotFoundError || error instanceof ConflictError || error instanceof BadRequestError) throw error; logger.error({ err: error, lineId: id }, "Failed to update journal line"); throw new InternalServerError("Failed to update journal line"); }
  }

  async remove(id: string, actorId: string): Promise<JournalLine> {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.journalLine.findUnique({ where: { id }, select: { id: true, journal_entry_id: true, account_id: true, debit: true, credit: true, journal_entry: { select: { status: true } } } });
        if (!current) throw new NotFoundError(`Journal line with ID '${id}' not found`);
        if (current.journal_entry.status !== "draft") throw new ConflictError("Only lines belonging to draft journal entries can be deleted");
        const deleted = await tx.journalLine.delete({ where: { id } });
        await tx.auditLog.create({ data: { user_id: actorId, action: "JOURNAL_LINE_DELETED", entity_type: "JournalLine", entity_id: id, old_value: { journal_entry_id: current.journal_entry_id, account_id: current.account_id, debit: current.debit.toString(), credit: current.credit.toString() } } });
        return deleted;
      });
    } catch (error) { if (error instanceof NotFoundError || error instanceof ConflictError) throw error; logger.error({ err: error, lineId: id }, "Failed to delete journal line"); throw new InternalServerError("Failed to delete journal line"); }
  }
}

export const journalLineRepository = new JournalLineRepository();
