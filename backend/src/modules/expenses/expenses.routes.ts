import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { expensesController } from "./expenses.controller.js";
import { createExpenseSchema, expenseIdParamSchema, queryExpensesSchema, updateExpenseSchema } from "./expenses.validation.js";

const router: Router = Router();
const financialRoles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, validate({ query: queryExpensesSchema }), expensesController.list);
router.post("/", requireAuth, validate(createExpenseSchema), expensesController.create);
router.get("/:id", requireAuth, validate({ params: expenseIdParamSchema }), expensesController.get);
router.put("/:id", requireAuth, validate({ params: expenseIdParamSchema, body: updateExpenseSchema }), expensesController.update);
router.post("/:id/approve", requireAuth, financialRoles, validate({ params: expenseIdParamSchema }), expensesController.approve);
router.post("/:id/post", requireAuth, financialRoles, validate({ params: expenseIdParamSchema }), expensesController.post);
export default router;
export { router as expensesRoutes };
