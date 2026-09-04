import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { salaryRunController } from "./salary-run.controller.js";
import { createSalaryRunSchema, querySalaryRunsSchema, salaryRunIdParamSchema, updateSalaryRunSchema } from "./salary-run.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, roles, validate({ query: querySalaryRunsSchema }), salaryRunController.list);
router.post("/", requireAuth, roles, validate(createSalaryRunSchema), salaryRunController.create);
router.get("/:id", requireAuth, roles, validate({ params: salaryRunIdParamSchema }), salaryRunController.get);
router.put("/:id", requireAuth, roles, validate({ params: salaryRunIdParamSchema, body: updateSalaryRunSchema }), salaryRunController.update);
router.put("/:id/approve", requireAuth, roles, validate({ params: salaryRunIdParamSchema }), salaryRunController.approve);
router.put("/:id/post", requireAuth, roles, validate({ params: salaryRunIdParamSchema }), salaryRunController.post);
router.put("/:id/pay", requireAuth, roles, validate({ params: salaryRunIdParamSchema }), salaryRunController.pay);
export default router;
export { router as salaryRunRoutes };
