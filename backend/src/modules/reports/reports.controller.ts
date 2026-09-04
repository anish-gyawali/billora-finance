import type { NextFunction, Request, Response } from "express";
import { reportsService } from "./reports.service.js";
import type { BalanceSheetQuery, ProfitLossQuery, TrialBalanceQuery } from "./reports.validation.js";
export class ReportsController {
  trialBalance = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await reportsService.trialBalance(req.query as unknown as TrialBalanceQuery) }); } catch (e) { next(e); } };
  profitLoss = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await reportsService.profitLoss(req.query as unknown as ProfitLossQuery) }); } catch (e) { next(e); } };
  balanceSheet = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await reportsService.balanceSheet(req.query as unknown as BalanceSheetQuery) }); } catch (e) { next(e); } };
}
export const reportsController = new ReportsController();
