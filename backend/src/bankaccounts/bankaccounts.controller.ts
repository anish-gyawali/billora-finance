import type { NextFunction, Request, Response } from "express";
import { bankAccountsService } from "./bankaccounts.service.js";
import type { BankAccountQuery, CreateBankAccountInput, UpdateBankAccountInput } from "./bankaccounts.validation.js";

export class BankAccountsController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const query = req.query as unknown as BankAccountQuery; const result = await bankAccountsService.list(query); res.json({ success: true, data: result.items, meta: { pagination: { total: result.total, page: query.page, limit: query.limit, totalPages: Math.ceil(result.total / query.limit) } } }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await bankAccountsService.get(req.params.id as string) }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await bankAccountsService.create(req.body as CreateBankAccountInput, req.user!.userId) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await bankAccountsService.update(req.params.id as string, req.body as UpdateBankAccountInput, req.user!.userId) }); } catch (error) { next(error); } };
  remove = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await bankAccountsService.remove(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
  balance = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await bankAccountsService.getBalance(req.params.id as string) }); } catch (error) { next(error); } };
}
export const bankAccountsController = new BankAccountsController();
