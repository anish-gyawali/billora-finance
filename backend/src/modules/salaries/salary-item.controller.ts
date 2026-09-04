import type { NextFunction, Request, Response } from "express";
import { salaryRunService } from "./salary-run.service.js";
import { salaryItemService } from "./salary-item.service.js";
import type { CreateSalaryItemInput, UpdateSalaryItemInput } from "./salary-item.validation.js";

export class SalaryItemController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: (await salaryItemService.list(req.params.salaryRunId as string)) }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await salaryRunService.addItem(req.params.salaryRunId as string, req.body as CreateSalaryItemInput, req.user!.userId) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.updateItem(req.params.salaryRunId as string, req.params.itemId as string, req.body as UpdateSalaryItemInput, req.user!.userId) }); } catch (error) { next(error); } };
  delete = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.deleteItem(req.params.salaryRunId as string, req.params.itemId as string, req.user!.userId) }); } catch (error) { next(error); } };
}
export const salaryItemController = new SalaryItemController();
