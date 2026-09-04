import { Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { salaryRunRepository, type ISalaryRunRepository, type SalaryDetails } from "./salary-run.repository.js";
import type { CreateSalaryRunInput, QuerySalaryRunsInput, UpdateSalaryRunInput } from "./salary-run.validation.js";
import type { CreateSalaryItemInput, UpdateSalaryItemInput } from "./salary-item.validation.js";

const d = (value: number | Prisma.Decimal) => new Prisma.Decimal(String(value));
const summary = (run: SalaryDetails) => ({ total_gross: run.items.reduce((s, i) => s.plus(d(i.gross_amount)), d(0)).toString(), total_tds: run.items.reduce((s, i) => s.plus(d(i.tds_amount)), d(0)).toString(), total_net: run.items.reduce((s, i) => s.plus(d(i.net_amount)), d(0)).toString(), item_count: run.items.length, paid_items: run.items.filter((i) => i.paid).length, unpaid_items: run.items.filter((i) => !i.paid).length });

export class SalaryRunService {
  constructor(private readonly repository: ISalaryRunRepository = salaryRunRepository) {}
  async create(input: CreateSalaryRunInput, actorId: string) { const run = await this.repository.create(input); await this.audit(actorId, "SALARY_RUN_CREATED", run.id, { status: run.status, item_count: run.items.length }); return this.present(run); }
  async list(input: QuerySalaryRunsInput) { const result = await this.repository.findAll(input); return { runs: result.runs.map((run) => this.present(run)), total: result.total }; }
  async get(id: string) { const run = await this.repository.findById(id); if (!run) throw new NotFoundError(`Salary run with ID '${id}' not found`); return this.present(run); }
  async update(id: string, input: UpdateSalaryRunInput, actorId: string) { const current = await this.require(id); const run = await this.repository.update(id, input); await this.audit(actorId, "SALARY_RUN_UPDATED", id, { status: current.status }, { status: run.status }); return this.present(run); }
  async items(id: string) { const run = await this.require(id); return { salary_run_id: run.id, items: await this.repository.findItems(id) }; }
  async addItem(id: string, input: CreateSalaryItemInput, actorId: string) { const run = await this.require(id); if (run.status !== "draft") throw new ConflictError("Only draft salary runs can have items added"); if (d(input.tds_amount ?? 0).gt(d(input.gross_amount))) throw new BadRequestError("TDS cannot exceed gross salary"); const updated = await this.repository.addItem(id, input); await this.audit(actorId, "SALARY_ITEM_CREATED", id, { user_id: input.user_id }); return this.present(updated); }
  async updateItem(runId: string, itemId: string, input: UpdateSalaryItemInput, actorId: string) { const run = await this.require(runId); if (run.status !== "draft") throw new ConflictError("Only draft salary runs can have items edited"); const current = run.items.find((item) => item.id === itemId); if (!current) throw new NotFoundError("Salary item was not found in this salary run"); const gross = input.gross_amount ?? Number(current.gross_amount); const tds = input.tds_amount ?? Number(current.tds_amount); if (d(tds).gt(d(gross))) throw new BadRequestError("TDS cannot exceed gross salary"); const updated = await this.repository.updateItem(runId, itemId, input); await this.audit(actorId, "SALARY_ITEM_UPDATED", runId, { item_id: itemId }, { gross_amount: gross, tds_amount: tds }); return this.present(updated); }
  async deleteItem(runId: string, itemId: string, actorId: string) { await this.repository.deleteItem(runId, itemId); await this.audit(actorId, "SALARY_ITEM_DELETED", runId, { item_id: itemId }); return { salary_run_id: runId, item_id: itemId }; }
  async approve(id: string, actorId: string) { const current = await this.require(id); const run = await this.repository.approve(id, actorId); await this.audit(actorId, "SALARY_RUN_APPROVED", id, { status: current.status }, { status: run.status, approved_by: actorId }); return this.present(run); }
  async post(id: string, actorId: string) { const current = await this.require(id); const run = await this.repository.post(id, actorId); await this.audit(actorId, "SALARY_RUN_POSTED", id, { status: current.status }, { status: run.status, journal_entry_id: run.journal_entry_id }); return this.present(run); }
  async pay(id: string, actorId: string) { const current = await this.require(id); const run = await this.repository.markPaid(id); await this.audit(actorId, "SALARY_RUN_PAID", id, { status: current.status }, { status: run.status }); return this.present(run); }
  private async require(id: string): Promise<SalaryDetails> { const run = await this.repository.findById(id); if (!run) throw new NotFoundError(`Salary run with ID '${id}' not found`); return run; }
  private present(run: SalaryDetails) { return { ...run, summary: summary(run) }; }
  private async audit(userId: string, action: string, id: string, old_value?: Record<string, unknown>, new_value?: Record<string, unknown>) { await this.repository.recordAudit({ user_id: userId, action, entity_id: id, ...(old_value ? { old_value } : {}), ...(new_value ? { new_value } : {}) }); }
}
export const salaryRunService = new SalaryRunService();
