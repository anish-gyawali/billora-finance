import type { Request, Response, NextFunction } from "express";
import type { ApiResponse } from "../../common/types/index.js";
import { PeriodService, periodService } from "./period.service.js";
import type { CreatePeriodInput, QueryPeriodsInput } from "./period.validation.js";

export class PeriodController {
  constructor(private readonly service: PeriodService = periodService) {}

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.listPeriods(req.query as unknown as QueryPeriodsInput);
      const response: ApiResponse<typeof result.items> = {
        success: true,
        data: result.items,
        meta: { total: result.total, page: result.page, pageSize: result.page_size },
      };
      res.status(200).json(response);
    } catch (error) { next(error); }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = await this.service.getPeriod(req.params.id as string);
      res.status(200).json({ success: true, data: period } satisfies ApiResponse<typeof period>);
    } catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = await this.service.createPeriod(req.body as CreatePeriodInput, req.user?.userId);
      res.status(201).json({ success: true, data: period } satisfies ApiResponse<typeof period>);
    } catch (error) { next(error); }
  };

  close = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const period = await this.service.closePeriod(req.params.id as string, req.user?.userId);
      res.status(200).json({ success: true, data: period } satisfies ApiResponse<typeof period>);
    } catch (error) { next(error); }
  };
}

export const periodController = new PeriodController();
