import { NotFoundError } from "../../common/errors/AppError.js";
import { salaryItemRepository, type ISalaryItemRepository } from "./salary-item.repository.js";
import { salaryRunRepository } from "./salary-run.repository.js";

export class SalaryItemService {
  constructor(private readonly repository: ISalaryItemRepository = salaryItemRepository) {}
  async list(runId: string) { if (!(await salaryRunRepository.findById(runId))) throw new NotFoundError(`Salary run with ID '${runId}' not found`); return this.repository.findAll(runId); }
}
export const salaryItemService = new SalaryItemService();
