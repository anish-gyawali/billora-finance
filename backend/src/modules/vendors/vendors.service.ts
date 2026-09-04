import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { vendorsRepository, type IVendorsRepository, type VendorDetails } from "./vendors.repository.js";
import type { CreateVendorInput, QueryVendorsInput, UpdateVendorInput } from "./vendors.validation.js";
import type { Vendor } from "../../generated/prisma/client.js";

export class VendorsService {
  constructor(private readonly repository: IVendorsRepository = vendorsRepository) {}
  create(input: CreateVendorInput): Promise<Vendor> { return this.repository.create(input); }
  list(input: QueryVendorsInput) { return this.repository.findAll(input); }
  async get(id: string): Promise<VendorDetails> { const vendor = await this.repository.findById(id); if (!vendor) throw new NotFoundError(`Vendor with ID '${id}' not found`); return vendor; }
  async update(id: string, input: UpdateVendorInput): Promise<Vendor> { const existing = await this.get(id); if (input.name !== undefined && input.name.trim().length === 0) throw new BadRequestError("Vendor name cannot be empty"); return this.repository.update(existing.id, input); }
}
export const vendorsService = new VendorsService();
