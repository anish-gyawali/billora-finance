import type { AccountingPeriod } from "../../generated/prisma/client.js";
import type { PeriodStatus } from "../../generated/prisma/enums.js";
import type { Prisma } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../config/logger.js";
import { InternalServerError, NotFoundError, ConflictError } from "../../common/errors/AppError.js";

export interface PeriodFilter {
  status?: PeriodStatus | undefined;
  page?: number | undefined;
  page_size?: number | undefined;
}

export interface PeriodListResult {
  items: AccountingPeriod[];
  total: number;
  page: number;
  page_size: number;
}

export interface PeriodAuditInput {
  user_id: string | undefined;
  action: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface IPeriodRepository {
  findAll(filter?: PeriodFilter): Promise<PeriodListResult>;
  findById(id: string): Promise<AccountingPeriod | null>;
  findOverlapping(start: Date, end: Date): Promise<AccountingPeriod | null>;
  countDraftEntries(id: string): Promise<number>;
  create(start: Date, end: Date): Promise<AccountingPeriod>;
  close(id: string): Promise<AccountingPeriod>;
  recordAudit(input: PeriodAuditInput): Promise<void>;
}

export class PeriodRepository implements IPeriodRepository {
  async findAll(filter?: PeriodFilter): Promise<PeriodListResult> {
    try {
      const page = filter?.page ?? 1;
      const pageSize = filter?.page_size ?? 50;
      const where: Prisma.AccountingPeriodWhereInput = filter?.status
        ? { status: filter.status }
        : {};
      const [items, total] = await prisma.$transaction([
        prisma.accountingPeriod.findMany({
          where,
          orderBy: { period_start: "asc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.accountingPeriod.count({ where }),
      ]);
      return { items, total, page, page_size: pageSize };
    } catch (error) {
      logger.error({ err: error, filter }, "Failed to fetch accounting periods");
      throw new InternalServerError("Failed to retrieve accounting periods");
    }
  }

  async findById(id: string): Promise<AccountingPeriod | null> {
    try {
      return await prisma.accountingPeriod.findUnique({ where: { id } });
    } catch (error) {
      logger.error({ err: error, periodId: id }, "Failed to find accounting period");
      throw new InternalServerError("Failed to query accounting period");
    }
  }

  async findOverlapping(start: Date, end: Date): Promise<AccountingPeriod | null> {
    try {
      return await prisma.accountingPeriod.findFirst({
        where: { period_start: { lt: end }, period_end: { gt: start } },
        orderBy: { period_start: "asc" },
      });
    } catch (error) {
      logger.error({ err: error, start, end }, "Failed to check accounting period overlap");
      throw new InternalServerError("Failed to validate accounting period range");
    }
  }

  async countDraftEntries(id: string): Promise<number> {
    try {
      return await prisma.journalEntry.count({ where: { period_id: id, status: "draft" } });
    } catch (error) {
      logger.error({ err: error, periodId: id }, "Failed to check draft journal entries");
      throw new InternalServerError("Failed to validate accounting period closure");
    }
  }

  async create(start: Date, end: Date): Promise<AccountingPeriod> {
    try {
      return await prisma.accountingPeriod.create({ data: { period_start: start, period_end: end } });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2002") {
        throw new ConflictError("An accounting period with this date range already exists");
      }
      logger.error({ err: error, start, end }, "Failed to create accounting period");
      throw new InternalServerError("Failed to create accounting period");
    }
  }

  async close(id: string): Promise<AccountingPeriod> {
    try {
      return await prisma.accountingPeriod.update({ where: { id }, data: { status: "closed" } });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === "P2025") {
        throw new NotFoundError(`Accounting period with ID '${id}' not found`);
      }
      logger.error({ err: error, periodId: id }, "Failed to close accounting period");
      throw new InternalServerError("Failed to close accounting period");
    }
  }

  async recordAudit(input: PeriodAuditInput): Promise<void> {
    try {
      const data: Prisma.AuditLogCreateInput = {
        user_id: input.user_id ?? null,
        action: input.action,
        entity_type: "AccountingPeriod",
        entity_id: input.entity_id,
      };
      if (input.old_value) data.old_value = input.old_value as Prisma.InputJsonValue;
      if (input.new_value) data.new_value = input.new_value as Prisma.InputJsonValue;
      await prisma.auditLog.create({ data });
    } catch (error) {
      logger.error({ err: error, periodId: input.entity_id, action: input.action }, "Failed to write period audit log");
    }
  }
}

export const periodRepository = new PeriodRepository();
