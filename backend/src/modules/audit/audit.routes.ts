import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { auditController } from "./audit.controller.js";
import { auditEntitySchema, auditExportSchema, auditQuerySchema, auditSummarySchema, auditUserSchema } from "./audit.validation.js";

const router: Router = Router();
const founder = requireRole(UserRole.founder);
const accountantOrFounder = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, validate({ query: auditQuerySchema }), auditController.list);
router.get("/summary", requireAuth, accountantOrFounder, validate({ query: auditSummarySchema }), auditController.summary);
router.get("/errors", requireAuth, founder, validate({ query: auditQuerySchema }), auditController.errors);
router.get("/export", requireAuth, founder, validate({ query: auditExportSchema }), auditController.export);
router.get("/entity/:type/:id", requireAuth, validate({ params: auditEntitySchema }), auditController.entity);
router.get("/user/:userId", requireAuth, validate({ params: auditUserSchema }), auditController.user);
export default router;
export { router as auditRoutes };
