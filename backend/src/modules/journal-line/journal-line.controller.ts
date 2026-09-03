import type { NextFunction, Request, Response } from "express";
import type { ApiResponse } from "../../common/types/index.js";
import { JournalLineService, journalLineService } from "./journal-line.service.js";
import type { CreateJournalLineInput, UpdateJournalLineInput } from "./journal-line.validation.js";

export class JournalLineController {
  constructor(private readonly service: JournalLineService = journalLineService) {}

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const data = await this.service.get(req.params.id as string); res.status(200).json({ success: true, data } satisfies ApiResponse<typeof data>); }
    catch (error) { next(error); }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const data = await this.service.create(req.body as CreateJournalLineInput, req.user!.userId); res.status(201).json({ success: true, data } satisfies ApiResponse<typeof data>); }
    catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const data = await this.service.update(req.params.id as string, req.body as UpdateJournalLineInput, req.user!.userId); res.status(200).json({ success: true, data } satisfies ApiResponse<typeof data>); }
    catch (error) { next(error); }
  };

  remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const data = await this.service.remove(req.params.id as string, req.user!.userId); res.status(200).json({ success: true, data } satisfies ApiResponse<typeof data>); }
    catch (error) { next(error); }
  };
}

export const journalLineController = new JournalLineController();
