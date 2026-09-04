import type { NextFunction, Request, Response } from "express";
import { invoicesService } from "./invoices.service.js";
import type { CreateInvoiceInput, CreatePaymentInput, QueryInvoicesInput, UpdateInvoiceInput } from "./invoices.validation.js";
import type { ApiResponse } from "../../common/types/index.js";

export class InvoicesController {
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const invoice = await invoicesService.create(req.body as CreateInvoiceInput, req.user!.userId); res.status(201).json({ success: true, data: invoice } satisfies ApiResponse<typeof invoice>); } catch (error) { next(error); }
  };

  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const result = await invoicesService.list(req.query as unknown as QueryInvoicesInput); res.status(200).json({ success: true, data: result.invoices, meta: { pagination: { total: result.total, page: Number(req.query.page), limit: Number(req.query.limit), totalPages: Math.ceil(result.total / Number(req.query.limit)) } } }); } catch (error) { next(error); }
  };

  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const invoice = await invoicesService.get(req.params.id as string); res.status(200).json({ success: true, data: invoice } satisfies ApiResponse<typeof invoice>); } catch (error) { next(error); }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const invoice = await invoicesService.update(req.params.id as string, req.body as UpdateInvoiceInput, req.user!.userId); res.status(200).json({ success: true, data: invoice } satisfies ApiResponse<typeof invoice>); } catch (error) { next(error); }
  };

  send = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const invoice = await invoicesService.send(req.params.id as string, req.user!.userId); res.status(200).json({ success: true, data: invoice } satisfies ApiResponse<typeof invoice>); } catch (error) { next(error); }
  };

  pay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const result = await invoicesService.pay(req.params.id as string, req.body as CreatePaymentInput, req.user!.userId); res.status(201).json({ success: true, data: result }); } catch (error) { next(error); }
  };

  void = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const invoice = await invoicesService.void(req.params.id as string, req.user!.userId); res.status(200).json({ success: true, data: invoice } satisfies ApiResponse<typeof invoice>); } catch (error) { next(error); }
  };

  aging = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const rows = await invoicesService.aging(); res.status(200).json({ success: true, data: rows }); } catch (error) { next(error); }
  };

  overdue = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try { const rows = await invoicesService.overdue(); res.status(200).json({ success: true, data: rows }); } catch (error) { next(error); }
  };
}

export const invoicesController = new InvoicesController();
