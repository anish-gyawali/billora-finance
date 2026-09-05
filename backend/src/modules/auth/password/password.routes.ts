import { Router } from "express";
import { requireAuth } from "../../../common/middleware/auth.js";
import { validate } from "../../../common/middleware/validate.js";
import { changePasswordSchema } from "./password.validation.js";
import { passwordController } from "./password.controller.js";

const router: Router = Router();

router.post("/change-password", requireAuth, validate(changePasswordSchema), passwordController.change);

export default router;
export { router as passwordRoutes };
