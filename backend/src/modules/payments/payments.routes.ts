import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { paymentsController } from "./payments.controller.js";
import { createPaymentSchema, paymentIdParamSchema, queryPaymentsSchema, updatePaymentSchema } from "./payments.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, roles, validate({ query: queryPaymentsSchema }), paymentsController.list);
router.post("/", requireAuth, roles, validate(createPaymentSchema), paymentsController.create);
router.get("/:id", requireAuth, roles, validate({ params: paymentIdParamSchema }), paymentsController.get);
router.put("/:id", requireAuth, roles, validate({ params: paymentIdParamSchema, body: updatePaymentSchema }), paymentsController.update);
export default router;
export { router as paymentsRoutes };
