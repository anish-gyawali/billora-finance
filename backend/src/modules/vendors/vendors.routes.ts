import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import { vendorsController } from "./vendors.controller.js";
import { createVendorSchema, queryVendorsSchema, updateVendorSchema, vendorIdParamSchema } from "./vendors.validation.js";

const router: Router = Router();
const roles = requireRole(UserRole.founder, UserRole.accountant);
router.get("/", requireAuth, roles, validate({ query: queryVendorsSchema }), vendorsController.list);
router.post("/", requireAuth, roles, validate(createVendorSchema), vendorsController.create);
router.get("/:id", requireAuth, roles, validate({ params: vendorIdParamSchema }), vendorsController.get);
router.put("/:id", requireAuth, roles, validate({ params: vendorIdParamSchema, body: updateVendorSchema }), vendorsController.update);
export default router;
export { router as vendorsRoutes };
