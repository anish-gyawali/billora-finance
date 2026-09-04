import { z } from "zod";

const optionalText = (max: number) => z.string().trim().max(max).nullable().optional().transform((value) => value === "" || value === undefined ? null : value);

export const createVendorSchema = z.object({
  name: z.string().trim().min(1, "Vendor name cannot be empty").max(255),
  pan_number: optionalText(50),
  vat_number: optionalText(50),
  contact_info: optionalText(1000),
}).strict();

export const updateVendorSchema = createVendorSchema.partial().strict().refine((value) => Object.keys(value).length > 0, { message: "At least one field must be provided for update" });
export const vendorIdParamSchema = z.object({ id: z.string().uuid() }).strict();
export const queryVendorsSchema = z.object({
  search: z.string().trim().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;
export type QueryVendorsInput = z.infer<typeof queryVendorsSchema>;
