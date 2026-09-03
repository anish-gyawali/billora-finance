import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { journalEntryController } from "./journal-entry.controller.js";
import { createJournalEntrySchema, updateJournalEntrySchema, reverseJournalEntrySchema, journalEntryIdParamSchema, queryJournalEntriesSchema } from "./journal-entry.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, roles, validate({ query: queryJournalEntriesSchema }), journalEntryController.list);
router.get("/:id", requireAuth, roles, validate({ params: journalEntryIdParamSchema }), journalEntryController.get);
router.post("/", requireAuth, roles, validate(createJournalEntrySchema), journalEntryController.create);
router.patch("/:id", requireAuth, roles, validate({ params: journalEntryIdParamSchema, body: updateJournalEntrySchema }), journalEntryController.update);
router.post("/:id/post", requireAuth, roles, validate({ params: journalEntryIdParamSchema }), journalEntryController.post);
router.post("/:id/reverse", requireAuth, roles, validate({ params: journalEntryIdParamSchema, body: reverseJournalEntrySchema }), journalEntryController.reverse);
export default router;
export { router as journalEntryRoutes };
