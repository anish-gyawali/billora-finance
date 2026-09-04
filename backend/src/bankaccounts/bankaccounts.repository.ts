import { Prisma } from "../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { ConflictError, InternalServerError, NotFoundError } from "../common/errors/AppError.js";
import { logger } from "../config/logger.js";
import type { BankAccountQuery, CreateBankAccountInput, UpdateBankAccountInput } from "./bankaccounts.validation.js";

const glSelect = { id: true, code: true, name: true, type: true, normal_balance: true, is_active: true } as const;
const include = { glAccount: { select: glSelect } } as const;
export type BankAccountRecord = Prisma.BankAccountGetPayload<{ include: typeof include }>;

export class BankAccountsRepository {
  async findAll(query: BankAccountQuery) {
    try {
      const search = query.search;
      const where: Prisma.BankAccountWhereInput = { is_active: true, ...(query.currency ? { currency: query.currency } : {}), ...(query.bank_name ? { bank_name: { contains: query.bank_name, mode: "insensitive" } } : {}), ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { bank_name: { contains: search, mode: "insensitive" } }, { account_number: { contains: search, mode: "insensitive" } }] } : {}) };
      const [items, total] = await prisma.$transaction([
        prisma.bankAccount.findMany({ where, include, orderBy: [{ bank_name: "asc" }, { name: "asc" }], skip: (query.page - 1) * query.limit, take: query.limit }),
        prisma.bankAccount.count({ where }),
      ]);
      return { items, total };
    } catch (error) { logger.error({ err: error }, "Failed to list bank accounts"); throw new InternalServerError("Failed to list bank accounts"); }
  }

  async findById(id: string): Promise<BankAccountRecord | null> {
    try { return await prisma.bankAccount.findFirst({ where: { id, is_active: true }, include }); }
    catch (error) { logger.error({ err: error, bankAccountId: id }, "Failed to fetch bank account"); throw new InternalServerError("Failed to fetch bank account"); }
  }

  async create(input: CreateBankAccountInput): Promise<BankAccountRecord> {
    try { return await prisma.bankAccount.create({ data: { ...input, name: input.name.trim(), bank_name: input.bank_name.trim(), account_number: input.account_number.trim(), currency: input.currency }, include }); }
    catch (error) { return this.mapWriteError(error, "Failed to create bank account"); }
  }

  async update(id: string, input: UpdateBankAccountInput): Promise<BankAccountRecord> {
    try { const data: Prisma.BankAccountUpdateInput = { updated_at: new Date(), ...(input.name !== undefined ? { name: input.name.trim() } : {}), ...(input.bank_name !== undefined ? { bank_name: input.bank_name.trim() } : {}), ...(input.account_number !== undefined ? { account_number: input.account_number.trim() } : {}), ...(input.currency !== undefined ? { currency: input.currency } : {}) }; return await prisma.bankAccount.update({ where: { id }, data, include }); }
    catch (error) { return this.mapWriteError(error, "Failed to update bank account"); }
  }

  async deactivate(id: string): Promise<BankAccountRecord> {
    try { return await prisma.bankAccount.update({ where: { id }, data: { is_active: false, deleted_at: new Date(), updated_at: new Date() }, include }); }
    catch (error) { return this.mapWriteError(error, "Failed to deactivate bank account"); }
  }

  async findGlAccount(id: string) { return prisma.account.findUnique({ where: { id }, select: { id: true, type: true, is_active: true } }); }
  async linkedAccount(id: string) { return prisma.bankAccount.findUnique({ where: { gl_account_id: id }, select: { id: true, is_active: true } }); }
  async transactionCount(glAccountId: string) { const [payments, expenses, lines] = await prisma.$transaction([prisma.payment.count({ where: { account_id: glAccountId } }), prisma.expense.count({ where: { payment_account_id: glAccountId } }), prisma.journalLine.count({ where: { account_id: glAccountId } })]); return payments + expenses + lines; }
  async balance(glAccountId: string) { const sums = await prisma.journalLine.aggregate({ where: { account_id: glAccountId, journal_entry: { status: "posted" } }, _sum: { debit: true, credit: true } }); const debit = sums._sum.debit ?? new Prisma.Decimal(0); const credit = sums._sum.credit ?? new Prisma.Decimal(0); return { debit, credit, balance: debit.minus(credit) }; }
  async audit(input: { user_id: string; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown> }) { try { const data: Prisma.AuditLogCreateInput = { user_id: input.user_id, action: input.action, entity_type: "BankAccount", entity_id: input.entity_id, ...(input.old_value ? { old_value: input.old_value as Prisma.InputJsonValue } : {}), ...(input.new_value ? { new_value: input.new_value as Prisma.InputJsonValue } : {}) }; await prisma.auditLog.create({ data }); } catch (error) { logger.error({ err: error, bankAccountId: input.entity_id }, "Failed to write bank account audit log"); } }
  private mapWriteError(error: unknown, message: string): never { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") throw new NotFoundError("Bank account was not found"); if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new ConflictError("This GL account is already linked to a bank account"); logger.error({ err: error }, message); throw new InternalServerError(message); }
}
export const bankAccountsRepository = new BankAccountsRepository();
