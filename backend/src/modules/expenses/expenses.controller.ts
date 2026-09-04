import type { NextFunction, Request, Response } from "express";
import { expensesService } from "./expenses.service.js";
import type { CreateExpenseInput, QueryExpensesInput, UpdateExpenseInput } from "./expenses.validation.js";

export class ExpensesController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const result = await expensesService.list(req.query as unknown as QueryExpensesInput, { userId: req.user!.userId, role: req.user!.role }); res.status(200).json({ success: true, data: result.expenses, meta: { pagination: { total: result.total, page: Number(req.query.page), limit: Number(req.query.limit), totalPages: Math.ceil(result.total / Number(req.query.limit)) } } }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await expensesService.create(req.body as CreateExpenseInput, { userId: req.user!.userId, role: req.user!.role }) }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await expensesService.get(req.params.id as string, { userId: req.user!.userId, role: req.user!.role }) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await expensesService.update(req.params.id as string, req.body as UpdateExpenseInput, { userId: req.user!.userId, role: req.user!.role }) }); } catch (error) { next(error); } };
  approve = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await expensesService.approve(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
  post = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await expensesService.post(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
}
export const expensesController = new ExpensesController();
