import type { Request, Response, NextFunction } from "express";
import { AccountService, accountService } from "./account.service.js";
import type {
  CreateAccountInput,
  UpdateAccountInput,
  QueryAccountsInput,
} from "./account.validation.js";
import type { ApiResponse } from "../../common/types/index.js";
import type { Account } from "../../generated/prisma/client.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../common/errors/AppError.js";

export class AccountController {
  constructor(private readonly service: AccountService = accountService) {}

  /**
   * GET /api/chart-of-accounts
   * Lists all General Ledger accounts with optional query filtering
   */
  list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      const query = req.query as unknown as QueryAccountsInput;
      const result = await this.service.listAccounts(query);

      const response: ApiResponse<Account[]> = {
        success: true,
        data: result.items,
        meta: {
          total: result.total,
          page: result.page,
          pageSize: result.page_size,
          requestId,
          durationMs: Date.now() - startTime,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn({ requestId, errorCode: error.code, message: error.message }, "Failed to list accounts");
      } else {
        logger.error({ requestId, err: error }, "Unexpected error listing accounts");
      }
      next(error);
    }
  };

  /**
   * POST /api/chart-of-accounts
   * Creates a new General Ledger account
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      const input = req.body as CreateAccountInput;
      const account = await this.service.createAccount(input, req.user?.userId);

      logger.info(
        {
          requestId,
          accountId: account.id,
          code: account.code,
          name: account.name,
          type: account.type,
          createdBy: req.user?.userId,
          action: "GL_ACCOUNT_CREATED",
        },
        "GL account created successfully"
      );

      const response: ApiResponse<Account> = {
        success: true,
        data: account,
        meta: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn({ requestId, errorCode: error.code, message: error.message }, "Failed to create account");
      } else {
        logger.error({ requestId, err: error }, "Unexpected error creating account");
      }
      next(error);
    }
  };

  /**
   * GET /api/chart-of-accounts/:id
   * Retrieves single General Ledger account details by ID
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const account = await this.service.getAccountById(id);

      const response: ApiResponse<Account> = {
        success: true,
        data: account,
        meta: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn({ requestId, errorCode: error.code, message: error.message }, "Failed to get account by ID");
      } else {
        logger.error({ requestId, err: error }, "Unexpected error fetching account by ID");
      }
      next(error);
    }
  };

  /**
   * PUT /api/chart-of-accounts/:id
   * Updates an existing General Ledger account
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const input = req.body as UpdateAccountInput;
      const account = await this.service.updateAccount(id, input, req.user?.userId);

      logger.info(
        {
          requestId,
          accountId: account.id,
          code: account.code,
          updatedBy: req.user?.userId,
          action: "GL_ACCOUNT_UPDATED",
        },
        "GL account updated successfully"
      );

      const response: ApiResponse<Account> = {
        success: true,
        data: account,
        meta: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn({ requestId, errorCode: error.code, message: error.message }, "Failed to update account");
      } else {
        logger.error({ requestId, err: error }, "Unexpected error updating account");
      }
      next(error);
    }
  };

  /**
   * DELETE /api/chart-of-accounts/:id
   * Soft-deactivates an account (sets is_active to false)
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const requestId =
      (req as unknown as { id?: string }).id ||
      (req.headers["x-request-id"] as string) ||
      "unknown";
    const startTime = Date.now();

    try {
      const { id } = req.params as { id: string };
      const account = await this.service.deactivateAccount(id, req.user?.userId);

      logger.info(
        {
          requestId,
          accountId: account.id,
          code: account.code,
          deactivatedBy: req.user?.userId,
          action: "GL_ACCOUNT_DEACTIVATED",
        },
        "GL account deactivated successfully"
      );

      const response: ApiResponse<{ message: string; account: Account }> = {
        success: true,
        data: {
          message: `Account '${account.code} - ${account.name}' has been deactivated`,
          account,
        },
        meta: {
          requestId,
          durationMs: Date.now() - startTime,
        },
      };

      res.status(200).json(response);
    } catch (error) {
      if (error instanceof AppError) {
        logger.warn({ requestId, errorCode: error.code, message: error.message }, "Failed to deactivate account");
      } else {
        logger.error({ requestId, err: error }, "Unexpected error deactivating account");
      }
      next(error);
    }
  };
}

export const accountController = new AccountController(accountService);
