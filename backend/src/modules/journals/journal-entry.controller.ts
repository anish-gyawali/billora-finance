import type { Request, Response, NextFunction } from "express";
import { journalEntryService, JournalEntryService } from "./journal-entry.service.js";
import type { ApiResponse } from "../../common/types/index.js";
import type { CreateJournalEntryInput, UpdateJournalEntryInput, ReverseJournalEntryInput, QueryJournalEntriesInput } from "./journal-entry.validation.js";

export class JournalEntryController {
  constructor(private readonly service: JournalEntryService = journalEntryService) {}
  list = async (req: Request, res: Response, next: NextFunction) => { try { const result = await this.service.list(req.query as unknown as QueryJournalEntriesInput); res.json({ success: true, data: result.items, meta: { total: result.total, page: result.page, pageSize: result.page_size } } satisfies ApiResponse); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.get(req.params.id as string); res.json({ success: true, data } satisfies ApiResponse<typeof data>); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.create(req.body as CreateJournalEntryInput, req.user!.userId); res.status(201).json({ success: true, data } satisfies ApiResponse<typeof data>); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.update(req.params.id as string, req.body as UpdateJournalEntryInput, req.user!.userId); res.json({ success: true, data } satisfies ApiResponse<typeof data>); } catch (error) { next(error); } };
  post = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.post(req.params.id as string, req.user!.userId); res.json({ success: true, data } satisfies ApiResponse<typeof data>); } catch (error) { next(error); } };
  reverse = async (req: Request, res: Response, next: NextFunction) => { try { const data = await this.service.reverse(req.params.id as string, req.body as ReverseJournalEntryInput, req.user!.userId); res.status(201).json({ success: true, data } satisfies ApiResponse<typeof data>); } catch (error) { next(error); } };
}
export const journalEntryController = new JournalEntryController();
