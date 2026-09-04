import type { NextFunction, Request, Response } from "express";
import { BadRequestError } from "../../common/errors/AppError.js";
import { documentsService } from "./documents.service.js";
import type { CreateDocumentInput, DocumentQuery } from "./documents.validation.js";

const actor = (r: Request) => ({ userId: r.user!.userId, role: r.user!.role });
export class DocumentsController {
  list = async (r: Request, s: Response, n: NextFunction) => { try { const q = r.query as unknown as DocumentQuery; const x = await documentsService.list(q, actor(r)); s.json({ success: true, data: x.items, meta: { pagination: { page: q.page, limit: q.limit, total: x.total, pages: Math.ceil(x.total / q.limit) } } }); } catch (e) { n(e); } };
  get = async (r: Request, s: Response, n: NextFunction) => { try { s.json({ success: true, data: await documentsService.get(r.params.id as string, actor(r)) }); } catch (e) { n(e); } };
  create = async (r: Request, s: Response, n: NextFunction) => { try { if (!r.file) throw new BadRequestError("A document file is required in the 'file' field"); s.status(201).json({ success: true, data: await documentsService.create(r.body as CreateDocumentInput, r.file, actor(r)) }); } catch (e) { n(e); } };
  remove = async (r: Request, s: Response, n: NextFunction) => { try { s.json({ success: true, data: await documentsService.remove(r.params.id as string, actor(r)) }); } catch (e) { n(e); } };
}
export const documentsController = new DocumentsController();
