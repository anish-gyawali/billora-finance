import type { AccountingPeriod } from "../../generated/prisma/client.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { periodRepository, type IPeriodRepository, type PeriodListResult } from "./period.repository.js";
import type { CreatePeriodInput, QueryPeriodsInput } from "./period.validation.js";

export class PeriodService {
  constructor(private readonly repo: IPeriodRepository = periodRepository) {}

  listPeriods(filter?: QueryPeriodsInput): Promise<PeriodListResult> {
    return this.repo.findAll(filter);
  }

  async getPeriod(id: string): Promise<AccountingPeriod> {
    const period = await this.repo.findById(id);
    if (!period) throw new NotFoundError(`Accounting period with ID '${id}' not found`);
    return period;
  }

  async createPeriod(input: CreatePeriodInput, actorId?: string): Promise<AccountingPeriod> {
    const overlap = await this.repo.findOverlapping(input.period_start, input.period_end);
    if (overlap) {
      throw new ConflictError(
        `Accounting period overlaps ${overlap.period_start.toISOString()} to ${overlap.period_end.toISOString()}`
      );
    }
    const period = await this.repo.create(input.period_start, input.period_end);
    await this.repo.recordAudit({
      user_id: actorId,
      action: "ACCOUNTING_PERIOD_CREATED",
      entity_id: period.id,
      new_value: { period_start: period.period_start.toISOString(), period_end: period.period_end.toISOString(), status: period.status },
    });
    return period;
  }

  async closePeriod(id: string, actorId?: string): Promise<AccountingPeriod> {
    const period = await this.getPeriod(id);
    if (period.status === "closed") return period;
    const draftCount = await this.repo.countDraftEntries(id);
    if (draftCount > 0) {
      throw new BadRequestError(`Cannot close period while ${draftCount} draft journal entr${draftCount === 1 ? "y" : "ies"} remain`);
    }
    const closed = await this.repo.close(id);
    await this.repo.recordAudit({
      user_id: actorId,
      action: "ACCOUNTING_PERIOD_CLOSED",
      entity_id: id,
      old_value: { status: period.status },
      new_value: { status: closed.status },
    });
    return closed;
  }
}

export const periodService = new PeriodService();
