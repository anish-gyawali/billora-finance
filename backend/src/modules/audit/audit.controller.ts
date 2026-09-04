import type { NextFunction, Request, Response } from "express";
import { auditService } from "./audit.service.js";
import type { AuditExportQuery, AuditQuery, AuditSummaryQuery } from "./audit.validation.js";

const scope = (req: Request) => ({ userId: req.user!.userId, founder: req.user!.role === "founder" });
export class AuditController {
  list = async (req: Request, res: Response, next: NextFunction) => { try { const q = req.query as unknown as AuditQuery; const result = await auditService.list(q, scope(req)); res.json({ success: true, data: result.items, meta: { pagination: { page: q.page, limit: q.limit, total: result.total, pages: Math.ceil(result.total / q.limit) } } }); } catch (e) { next(e); } };
  entity = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await auditService.entity(req.params.type as string, req.params.id as string, scope(req)) }); } catch (e) { next(e); } };
  user = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await auditService.userActivity(req.params.userId as string, scope(req)) }); } catch (e) { next(e); } };
  summary = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await auditService.summary(req.query as unknown as AuditSummaryQuery, scope(req)) }); } catch (e) { next(e); } };
  errors = async (req: Request, res: Response, next: NextFunction) => { try { res.json({ success: true, data: await auditService.errors(req.query as unknown as AuditQuery, scope(req)) }); } catch (e) { next(e); } };
  export = async (req: Request, res: Response, next: NextFunction) => { try { const result = await auditService.export(req.query as unknown as AuditExportQuery, scope(req)); if ("csv" in result) { res.type("text/csv").attachment("audit-log.csv").send(result.csv); return; } res.json({ success: true, data: result.rows }); } catch (e) { next(e); } };
}
export const auditController = new AuditController();
