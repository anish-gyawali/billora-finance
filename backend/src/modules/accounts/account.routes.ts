import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createAccountSchema,
  updateAccountSchema,
  accountIdParamSchema,
  queryAccountsSchema,
} from "./account.validation.js";
import { accountController } from "./account.controller.js";

const router: Router = Router();

/**
 * @route   GET /api/chart-of-accounts
 * @desc    List all GL accounts with optional query filters
 * @access  Accountant, Founder
 */
router.get(
  "/",
  requireAuth,
  requireRole(UserRole.founder, UserRole.accountant),
  validate({ query: queryAccountsSchema }),
  accountController.list
);

/**
 * @route   POST /api/chart-of-accounts
 * @desc    Create new GL account
 * @access  Founder only
 */
router.post(
  "/",
  requireAuth,
  requireRole(UserRole.founder),
  validate(createAccountSchema),
  accountController.create
);

/**
 * @route   GET /api/chart-of-accounts/:id
 * @desc    Get GL account details by ID
 * @access  Accountant, Founder
 */
router.get(
  "/:id",
  requireAuth,
  requireRole(UserRole.founder, UserRole.accountant),
  validate({ params: accountIdParamSchema }),
  accountController.getById
);

/**
 * @route   PUT /api/chart-of-accounts/:id
 * @desc    Update an existing GL account
 * @access  Founder only
 */
router.put(
  "/:id",
  requireAuth,
  requireRole(UserRole.founder),
  validate({ params: accountIdParamSchema, body: updateAccountSchema }),
  accountController.update
);

/**
 * @route   DELETE /api/chart-of-accounts/:id
 * @desc    Soft-deactivate an account
 * @access  Founder only
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(UserRole.founder),
  validate({ params: accountIdParamSchema }),
  accountController.delete
);

export default router;
export { router as accountRoutes };
