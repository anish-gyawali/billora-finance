import { Router } from "express";
import { authLimiter } from "../../../common/middleware/rateLimiter.js";
import { refreshTokenController } from "./refresh.controller.js";

const router: Router = Router();

/**
 * @route   POST /refresh
 * @desc    Rotates refresh token and issues new access token
 * @access  Public (Rate-limited via authLimiter, authenticated via Refresh Token cookie)
 */
router.post(
  "/refresh",
  authLimiter,
  refreshTokenController.refresh
);

export default router;
export { router as refreshRoutes };
