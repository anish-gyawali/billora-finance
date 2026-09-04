import type { NextFunction, Request, Response } from "express";
import { paymentsService } from "./payments.service.js";
import type { CreatePaymentInput, QueryPaymentsInput, UpdatePaymentInput } from "./payments.validation.js";

export class PaymentsController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const result = await paymentsService.list(req.query as unknown as QueryPaymentsInput); res.status(200).json({ success: true, data: result.payments, meta: { pagination: { total: result.total, page: Number(req.query.page), limit: Number(req.query.limit), totalPages: Math.ceil(result.total / Number(req.query.limit)) } } }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await paymentsService.create(req.body as CreatePaymentInput, req.user!.userId) }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await paymentsService.get(req.params.id as string) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await paymentsService.update(req.params.id as string, req.body as UpdatePaymentInput, req.user!.userId) }); } catch (error) { next(error); } };
}
export const paymentsController = new PaymentsController();
