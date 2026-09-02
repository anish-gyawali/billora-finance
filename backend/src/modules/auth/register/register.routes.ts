import { Router } from "express";
import { authLimiter } from "../../../common/middleware/rateLimiter.js";
import { validate } from "../../../common/middleware/validate.js";
import { registerSchema } from "./register.validation.js";
import { registerController } from "./register.controller.js";

const router: Router = Router();

/**
 * @route   POST /register (mounted under /api/auth and /auth)
 * @desc    Register a new user account
 * @access  Public (Rate-limited via authLimiter)
 *
 * Pipeline: Route -> authLimiter -> validate(registerSchema) -> registerController.register
 */
router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  registerController.register
);

export default router;
export { router as registerRoutes };
