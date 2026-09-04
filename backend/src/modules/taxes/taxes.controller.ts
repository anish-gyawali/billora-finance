import type { NextFunction, Request, Response } from "express";
import { taxesService } from "./taxes.service.js";
import type { ApplicableQuery, CreateTaxRuleInput, TaxRuleQuery, UpdateTaxRuleInput, VerifyTaxRuleInput } from "./taxes.validation.js";

export class TaxesController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const query = req.query as unknown as TaxRuleQuery; const result = await taxesService.list(query); res.json({ success: true, data: result.items, meta: { pagination: { page: query.page, limit: query.limit, total: result.total, pages: Math.ceil(result.total / query.limit) } } }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.get(req.params.id as string) }); } catch (error) { next(error); } };
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await taxesService.create(req.body as CreateTaxRuleInput, req.user!.userId) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.update(req.params.id as string, req.body as UpdateTaxRuleInput, req.user!.userId, req.user!.role === "founder") }); } catch (error) { next(error); } };
  verify = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.verify(req.params.id as string, req.body as VerifyTaxRuleInput, req.user!.userId) }); } catch (error) { next(error); } };
  applicable = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.applicable(req.query as unknown as ApplicableQuery) }); } catch (error) { next(error); } };
  history = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.history(req.params.tax_type as string) }); } catch (error) { next(error); } };
  archive = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await taxesService.archive(req.params.id as string, req.user!.userId) }); } catch (error) { next(error); } };
}
export const taxesController = new TaxesController();
