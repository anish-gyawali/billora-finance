import { Router } from "express";
import { requireAuth, requireRole } from "../../common/middleware/auth.js";
import { validate } from "../../common/middleware/validate.js";
import { UserRole } from "../../generated/prisma/enums.js";
import {
  createClientSchema,
  updateClientSchema,
  clientIdParamSchema,
  queryClientsSchema,
} from "./clients.validation.js";
import { clientsController } from "./clients.controller.js";

const router: Router = Router();
const clientRoles = requireRole(UserRole.founder, UserRole.accountant);

/**
 * @route   POST /api/clients
 * @desc    Create a new Client (Nepal or International)
 * @access  Founder, Accountant
 */
router.post(
  "/",
  requireAuth,
  clientRoles,
  validate(createClientSchema),
  clientsController.create
);

/**
 * @route   GET /api/clients
 * @desc    List all clients with search, filtering, and pagination
 * @access  Authenticated Users
 */
router.get(
  "/",
  requireAuth,
  clientRoles,
  validate({ query: queryClientsSchema }),
  clientsController.getAll
);

/**
 * @route   GET /api/clients/:id
 * @desc    Get client details by ID
 * @access  Authenticated Users
 */
router.get(
  "/:id",
  requireAuth,
  clientRoles,
  validate({ params: clientIdParamSchema }),
  clientsController.getById
);

/**
 * @route   PATCH /api/clients/:id
 * @desc    Update client details
 * @access  Founder, Accountant
 */
router.patch(
  "/:id",
  requireAuth,
  clientRoles,
  validate({ params: clientIdParamSchema, body: updateClientSchema }),
  clientsController.update
);

/**
 * @route   DELETE /api/clients/:id
 * @desc    Delete a client record
 * @access  Founder
 */
router.delete(
  "/:id",
  requireAuth,
  requireRole(UserRole.founder),
  validate({ params: clientIdParamSchema }),
  clientsController.delete
);

export default router;
export { router as clientsRoutes };
