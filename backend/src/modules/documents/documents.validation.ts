import { z } from "zod";
const uuid = z.string().uuid();
export const documentIdSchema = z.object({ id: uuid }).strict();
export const documentQuerySchema = z.object({ owner_type: z.enum(["expense", "invoice", "vendor", "user"]), owner_id: uuid, page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
export const createDocumentSchema = z.object({ owner_type: z.enum(["expense", "invoice", "vendor", "user"]), owner_id: uuid }).strict();
export type DocumentQuery = z.infer<typeof documentQuerySchema>; export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
