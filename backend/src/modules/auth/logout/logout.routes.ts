import { Router } from "express";
import { authLimiter } from "../../../common/middleware/rateLimiter.js";
import { validate } from "../../../common/middleware/validate.js";
import { logoutSchema } from "./logout.validation.js";
import { logoutController } from "./logout.controller.js";

const router: Router = Router();

/**
 * @route   POST /logout (mounted under /api/auth and /auth)
 * @desc    User logout - revokes refresh token session and clears authentication cookies
 * @access  Public / Authenticated (Rate-limited via authLimiter)
 */
router.post(
  "/logout",
  authLimiter,
  validate(logoutSchema),
  logoutController.logout
);

export default router;
export { router as logoutRoutes };