import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { invoicesController } from "./invoices.controller.js";
import { createInvoiceSchema, createPaymentSchema, invoiceIdParamSchema, queryInvoicesSchema, updateInvoiceSchema } from "./invoices.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);

router.get("/ar-aging", requireAuth, roles, invoicesController.aging);
router.get("/overdue", requireAuth, roles, invoicesController.overdue);
router.get("/", requireAuth, roles, validate({ query: queryInvoicesSchema }), invoicesController.list);
router.post("/", requireAuth, roles, validate(createInvoiceSchema), invoicesController.create);
router.get("/:id", requireAuth, roles, validate({ params: invoiceIdParamSchema }), invoicesController.get);
router.patch("/:id", requireAuth, roles, validate({ params: invoiceIdParamSchema, body: updateInvoiceSchema }), invoicesController.update);
router.post("/:id/send", requireAuth, roles, validate({ params: invoiceIdParamSchema }), invoicesController.send);
router.post("/:id/payments", requireAuth, roles, validate({ params: invoiceIdParamSchema, body: createPaymentSchema }), invoicesController.pay);
router.post("/:id/void", requireAuth, roles, validate({ params: invoiceIdParamSchema }), invoicesController.void);

export default router;
export { router as invoicesRoutes };
