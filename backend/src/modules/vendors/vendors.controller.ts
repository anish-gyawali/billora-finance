import type { NextFunction, Request, Response } from "express";
import { vendorsService } from "./vendors.service.js";
import type { CreateVendorInput, QueryVendorsInput, UpdateVendorInput } from "./vendors.validation.js";

export class VendorsController {
  create = async (req: Request, res: Response, next: NextFunction) => { try { res.status(201).json({ success: true, data: await vendorsService.create(req.body as CreateVendorInput) }); } catch (error) { next(error); } };
  list = async (req: Request, res: Response, next: NextFunction) => { try { const result = await vendorsService.list(req.query as unknown as QueryVendorsInput); res.status(200).json({ success: true, data: result.vendors, meta: { pagination: { total: result.total, page: Number(req.query.page), limit: Number(req.query.limit), totalPages: Math.ceil(result.total / Number(req.query.limit)) } } }); } catch (error) { next(error); } };
  get = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await vendorsService.get(req.params.id as string) }); } catch (error) { next(error); } };
  update = async (req: Request, res: Response, next: NextFunction) => { try { res.status(200).json({ success: true, data: await vendorsService.update(req.params.id as string, req.body as UpdateVendorInput) }); } catch (error) { next(error); } };
}
export const vendorsController = new VendorsController();
