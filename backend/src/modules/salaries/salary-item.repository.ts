import type { SalaryItem } from "../../generated/prisma/client.js";
import { salaryRunRepository } from "./salary-run.repository.js";

export interface ISalaryItemRepository { findAll(runId: string): Promise<SalaryItem[]>; }
export class SalaryItemRepository implements ISalaryItemRepository { findAll(runId: string) { return salaryRunRepository.findItems(runId); } }
export const salaryItemRepository = new SalaryItemRepository();
