import { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { InternalServerError } from "../../common/errors/AppError.js";
import { logger } from "../../config/logger.js";

export interface LineTotals { account_id: string; debit: Prisma.Decimal; credit: Prisma.Decimal; }
export class ReportsRepository {
  async accountTotals(from?: Date, to?: Date): Promise<LineTotals[]> { try { const entry: Prisma.JournalEntryWhereInput = { status: "posted", ...(from || to ? { entry_date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }; const grouped = await prisma.journalLine.groupBy({ by: ["account_id"], where: { journal_entry: entry }, _sum: { debit: true, credit: true } }); return grouped.map((row) => ({ account_id: row.account_id, debit: row._sum.debit ?? new Prisma.Decimal(0), credit: row._sum.credit ?? new Prisma.Decimal(0) })); } catch (error) { logger.error({ err: error, from, to }, "Failed to aggregate trial balance"); throw new InternalServerError("Failed to calculate trial balance"); } }
  async accounts() { try { return await prisma.account.findMany({ select: { id: true, code: true, name: true, type: true }, orderBy: { code: "asc" } }); } catch (error) { logger.error({ err: error }, "Failed to load report accounts"); throw new InternalServerError("Failed to load report accounts"); } }
  async unbalancedEntries(from?: Date, to?: Date) { try { const entry: Prisma.JournalEntryWhereInput = { status: "posted", ...(from || to ? { entry_date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }; const rows = await prisma.journalLine.groupBy({ by: ["journal_entry_id"], where: { journal_entry: entry }, _sum: { debit: true, credit: true } }); return rows.filter((r) => !(r._sum.debit ?? new Prisma.Decimal(0)).eq(r._sum.credit ?? new Prisma.Decimal(0))).map((r) => r.journal_entry_id); } catch (error) { logger.error({ err: error }, "Failed to validate posted journal entries"); throw new InternalServerError("Failed to validate posted journal entries"); } }
}
export const reportsRepository = new ReportsRepository();
