import type { NextFunction, Request, Response } from "express";
import { salaryRunService } from "./salary-run.service.js";
import type { CreateSalaryRunInput, QuerySalaryRunsInput, UpdateSalaryRunInput } from "./salary-run.validation.js";

export class SalaryRunController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const result = await salaryRunService.list(req.query as unknown as QuerySalaryRunsInput); res.status(200).json({ success: true, data: result.runs, meta: { pagination: { total: result.total, page: Number(req.query.page), limit: Number(req.query.limit), totalPages: Math.ceil(result.total / Number(req.query.limit)) } } }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await salaryRunService.create(req.body as CreateSalaryRunInput, req.user!.userId) }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.get(req.params.id as string) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.update(req.params.id as string, req.body as UpdateSalaryRunInput, req.user!.userId) }); } catch (error) { next(error); } };
  approve = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.approve(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
  post = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.post(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
  pay = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await salaryRunService.pay(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
}
export const salaryRunController = new SalaryRunController();
