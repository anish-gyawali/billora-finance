import { Router } from "express";
import { authLimiter } from "../../../common/middleware/rateLimiter.js";
import { validate } from "../../../common/middleware/validate.js";
import { loginSchema } from "./login.validation.js";
import { loginController } from "./login.controller.js";

const router: Router = Router();

/**
 * @route   POST /login (mounted under /api/auth and /auth)
 * @desc    Authenticate user and return tokens
 * @access  Public (Rate-limited via authLimiter)
 *
 * Pipeline: Route -> authLimiter -> validate(loginSchema) -> loginController.login
 */
router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  loginController.login
);

export default router;
export { router as loginRoutes };