import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { journalLineController } from "./journal-line.controller.js";
import { createJournalLineSchema, journalLineIdParamSchema, updateJournalLineSchema } from "./journal-line.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);

router.post("/", requireAuth, roles, validate(createJournalLineSchema), journalLineController.create);
router.get("/:id", requireAuth, roles, validate({ params: journalLineIdParamSchema }), journalLineController.get);
router.patch("/:id", requireAuth, roles, validate({ params: journalLineIdParamSchema, body: updateJournalLineSchema }), journalLineController.update);
router.delete("/:id", requireAuth, roles, validate({ params: journalLineIdParamSchema }), journalLineController.remove);

export default router;
export { router as journalLineRoutes };
