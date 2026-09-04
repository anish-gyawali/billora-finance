import { z } from "zod";
import { UserRole } from "../../generated/prisma/enums.js";
const uuid = z.string().uuid();
export const userIdSchema = z.object({ id: uuid }).strict();
export const usersQuerySchema = z.object({ role: z.nativeEnum(UserRole).optional(), is_active: z.coerce.boolean().optional(), search: z.string().trim().max(100).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(50) }).strict();
export const createUserSchema = z.object({ name: z.string().trim().min(2).max(255), email: z.string().email().transform((v) => v.toLowerCase().trim()), password: z.string().min(10).max(128), role: z.nativeEnum(UserRole), pan_number: z.string().trim().max(30).optional().nullable(), monthly_salary: z.coerce.number().finite().nonnegative().max(99999999999999.99).optional().nullable() }).strict();
export const updateUserSchema = z.object({ name: z.string().trim().min(2).max(255).optional(), role: z.nativeEnum(UserRole).optional(), is_active: z.boolean().optional(), pan_number: z.string().trim().max(30).optional().nullable(), monthly_salary: z.coerce.number().finite().nonnegative().max(99999999999999.99).optional().nullable() }).strict().refine((v) => Object.keys(v).length > 0, "At least one field must be provided");
export type UsersQuery = z.infer<typeof usersQuerySchema>; export type CreateUserInput = z.infer<typeof createUserSchema>; export type UpdateUserInput = z.infer<typeof updateUserSchema>;
