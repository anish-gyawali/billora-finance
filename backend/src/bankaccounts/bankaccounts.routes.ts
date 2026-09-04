import { Router } from "express";
import { requireAuth, requireRole } from "../common/middleware/auth.js";
import { validate } from "../common/middleware/validate.js";
import { UserRole } from "../generated/prisma/enums.js";
import { bankAccountsController } from "./bankaccounts.controller.js";
import { bankAccountIdParamSchema, bankAccountQuerySchema, createBankAccountSchema, updateBankAccountSchema } from "./bankaccounts.validation.js";

const router: Router = Router();
const editors = requireRole(UserRole.founder, UserRole.accountant);
const founderOnly = requireRole(UserRole.founder);
const id = validate({ params: bankAccountIdParamSchema });
router.get("/", requireAuth, validate({ query: bankAccountQuerySchema }), bankAccountsController.list);
router.post("/", requireAuth, editors, validate(createBankAccountSchema), bankAccountsController.create);
router.get("/:id/balance", requireAuth, id, bankAccountsController.balance);
router.get("/:id", requireAuth, id, bankAccountsController.get);
router.put("/:id", requireAuth, founderOnly, validate({ params: bankAccountIdParamSchema, body: updateBankAccountSchema }), bankAccountsController.update);
router.delete("/:id", requireAuth, founderOnly, id, bankAccountsController.remove);
export default router;
export { router as bankAccountsRoutes };
