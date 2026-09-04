import type { Prisma, Vendor, Expense } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../config/logger.js";
import { InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import type { CreateVendorInput, QueryVendorsInput, UpdateVendorInput } from "./vendors.validation.js";

export type VendorDetails = Vendor & { expenses: Expense[] };
export interface IVendorsRepository {
  create(input: CreateVendorInput): Promise<Vendor>;
  findById(id: string): Promise<VendorDetails | null>;
  findAll(input: QueryVendorsInput): Promise<{ vendors: Vendor[]; total: number }>;
  update(id: string, input: UpdateVendorInput): Promise<Vendor>;
}

const expenseSelect = { id: true, expense_date: true, status: true, total_amount: true, vendor_id: true, paid_by_user_id: true, payment_account_id: true, approved_by: true, journal_entry_id: true, created_at: true, updated_at: true } as const;

export class VendorsRepository implements IVendorsRepository {
  async create(input: CreateVendorInput): Promise<Vendor> {
    try { return await prisma.vendor.create({ data: { name: input.name, pan_number: input.pan_number ?? null, vat_number: input.vat_number ?? null, contact_info: input.contact_info ?? null } }); }
    catch (error) { logger.error({ err: error }, "Failed to create vendor"); throw new InternalServerError("Failed to create vendor"); }
  }
  async findById(id: string): Promise<VendorDetails | null> {
    try { return await prisma.vendor.findUnique({ where: { id }, include: { expenses: { select: expenseSelect, orderBy: { expense_date: "desc" } } } }); }
    catch (error) { logger.error({ err: error, vendorId: id }, "Failed to fetch vendor"); throw new InternalServerError("Failed to fetch vendor"); }
  }
  async findAll(input: QueryVendorsInput): Promise<{ vendors: Vendor[]; total: number }> {
    try {
      const where: Prisma.VendorWhereInput = input.search ? { OR: [{ name: { contains: input.search, mode: "insensitive" } }, { pan_number: { contains: input.search, mode: "insensitive" } }, { vat_number: { contains: input.search, mode: "insensitive" } }] } : {};
      const [vendors, total] = await prisma.$transaction([prisma.vendor.findMany({ where, orderBy: { name: "asc" }, skip: (input.page - 1) * input.limit, take: input.limit }), prisma.vendor.count({ where })]);
      return { vendors, total };
    } catch (error) { logger.error({ err: error }, "Failed to list vendors"); throw new InternalServerError("Failed to list vendors"); }
  }
  async update(id: string, input: UpdateVendorInput): Promise<Vendor> {
    try { return await prisma.vendor.update({ where: { id }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.pan_number !== undefined ? { pan_number: input.pan_number } : {}), ...(input.vat_number !== undefined ? { vat_number: input.vat_number } : {}), ...(input.contact_info !== undefined ? { contact_info: input.contact_info } : {}), updated_at: new Date() } }); }
    catch (error) { if (isCode(error, "P2025")) throw new NotFoundError(`Vendor with ID '${id}' not found`); logger.error({ err: error, vendorId: id }, "Failed to update vendor"); throw new InternalServerError("Failed to update vendor"); }
  }
}
const isCode = (error: unknown, code: string) => typeof error === "object" && error !== null && "code" in error && (error as { code: string }).code === code;
export const vendorsRepository = new VendorsRepository();
