import { z } from "zod";
import { PeriodStatus } from "../../generated/prisma/enums.js";

const dateInput = z.coerce.date({ error: "A valid date is required" });

export const createPeriodSchema = z
  .object({
    period_start: dateInput,
    period_end: dateInput,
  })
  .strict()
  .refine((value) => value.period_end > value.period_start, {
    path: ["period_end"],
    message: "Period end must be after period start",
  });

export const periodIdParamSchema = z.object({
  id: z.string().uuid("Invalid accounting period ID"),
}).strict();

export const queryPeriodsSchema = z.object({
  status: z.nativeEnum(PeriodStatus).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  page_size: z.coerce.number().int().min(1).max(100).optional().default(50),
}).strict();

export type CreatePeriodInput = z.infer<typeof createPeriodSchema>;
export type QueryPeriodsInput = z.infer<typeof queryPeriodsSchema>;
