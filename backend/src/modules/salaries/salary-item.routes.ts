import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { salaryItemController } from "./salary-item.controller.js";
import { createSalaryItemSchema, updateSalaryItemSchema } from "./salary-item.validation.js";
import { salaryItemParamSchema, salaryRunItemsParamSchema } from "./salary-run.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/:salaryRunId/items", requireAuth, roles, validate({ params: salaryRunItemsParamSchema }), salaryItemController.list);
router.post("/:salaryRunId/items", requireAuth, roles, validate({ params: salaryRunItemsParamSchema, body: createSalaryItemSchema }), salaryItemController.create);
router.put("/:salaryRunId/items/:itemId", requireAuth, roles, validate({ params: salaryItemParamSchema, body: updateSalaryItemSchema }), salaryItemController.update);
router.delete("/:salaryRunId/items/:itemId", requireAuth, roles, validate({ params: salaryItemParamSchema }), salaryItemController.delete);
export default router;
export { router as salaryItemRoutes };
