import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { createPeriodSchema, periodIdParamSchema, queryPeriodsSchema } from "./period.validation.js";
import { periodController } from "./period.controller.js";

const router: Router = Router();
const readRoles = requireRole(UserRole.founder, UserRole.accountant);
const writeRole = requireRole(UserRole.founder);

router.get("/", requireAuth, readRoles, validate({ query: queryPeriodsSchema }), periodController.list);
router.get("/:id", requireAuth, readRoles, validate({ params: periodIdParamSchema }), periodController.getById);
router.post("/", requireAuth, writeRole, validate(createPeriodSchema), periodController.create);
router.post("/:id/close", requireAuth, writeRole, validate({ params: periodIdParamSchema }), periodController.close);

export default router;
export { router as periodRoutes };
