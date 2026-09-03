import type { Account } from "../../generated/prisma/client.js";
import type { Prisma } from "../../generated/prisma/client.js";
import type { AccountType, NormalBalance } from "../../generated/prisma/enums.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../config/logger.js";
import { ConflictError, NotFoundError, InternalServerError } from "../../common/errors/AppError.js";

export interface AccountFilter {
  type?: AccountType | undefined;
  is_active?: boolean | undefined;
  parent_id?: string | null | undefined;
  search?: string | undefined;
}

export interface AccountListResult {
  items: Account[];
  total: number;
  page: number;
  page_size: number;
}

export interface AccountAuditInput {
  user_id: string | undefined;
  action: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
}

export interface CreateAccountRepoInput {
  code: string;
  name: string;
  type: AccountType;
  parent_id?: string | null | undefined;
  normal_balance: NormalBalance;
  is_active: boolean;
}

export interface UpdateAccountRepoInput {
  code?: string | undefined;
  name?: string | undefined;
  type?: AccountType | undefined;
  parent_id?: string | null | undefined;
  normal_balance?: NormalBalance | undefined;
  is_active?: boolean | undefined;
}

export interface IAccountRepository {
  findAll(filter?: AccountFilter & { page?: number; page_size?: number }): Promise<AccountListResult>;
  findById(id: string): Promise<Account | null>;
  findByCode(code: string): Promise<Account | null>;
  create(data: CreateAccountRepoInput): Promise<Account>;
  update(id: string, data: UpdateAccountRepoInput): Promise<Account>;
  softDelete(id: string): Promise<Account>;
  hasTransactions(id: string): Promise<boolean>;
  hasChildren(id: string): Promise<boolean>;
  count(): Promise<number>;
  recordAudit(input: AccountAuditInput): Promise<void>;
}

export class AccountRepository implements IAccountRepository {
  /**
   * Retrieves all accounts with optional filtering, sorted by code ascending.
   */
  async findAll(filter?: AccountFilter & { page?: number; page_size?: number }): Promise<AccountListResult> {
    try {
      const whereClause: Record<string, unknown> = {};

      if (filter?.type) {
        whereClause.type = filter.type;
      }

      if (filter?.is_active !== undefined) {
        whereClause.is_active = filter.is_active;
      }

      if (filter?.parent_id !== undefined) {
        whereClause.parent_id = filter.parent_id;
      }

      if (filter?.search) {
        whereClause.OR = [
          { code: { contains: filter.search, mode: "insensitive" } },
          { name: { contains: filter.search, mode: "insensitive" } },
        ];
      }

      const page = filter?.page ?? 1;
      const pageSize = filter?.page_size ?? 50;
      const [items, total] = await prisma.$transaction([
        prisma.account.findMany({
          where: whereClause,
          orderBy: [{ code: "asc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.account.count({ where: whereClause }),
      ]);
      return { items, total, page, page_size: pageSize };
    } catch (error) {
      logger.error({ err: error, filter }, "Failed to fetch accounts from database");
      throw new InternalServerError("Failed to retrieve accounts");
    }
  }

  /**
   * Retrieves a single account by ID.
   */
  async findById(id: string): Promise<Account | null> {
    try {
      return await prisma.account.findUnique({
        where: { id },
      });
    } catch (error) {
      logger.error({ err: error, accountId: id }, "Failed to find account by ID");
      throw new InternalServerError("Failed to query account");
    }
  }

  /**
   * Retrieves a single account by its unique code.
   */
  async findByCode(code: string): Promise<Account | null> {
    try {
      return await prisma.account.findUnique({
        where: { code: code.trim().toUpperCase() },
      });
    } catch (error) {
      logger.error({ err: error, code }, "Failed to find account by code");
      throw new InternalServerError("Failed to query account by code");
    }
  }

  /**
   * Creates a new account in the database.
   */
  async create(data: CreateAccountRepoInput): Promise<Account> {
    try {
      return await prisma.account.create({
        data: {
          code: data.code.trim().toUpperCase(),
          name: data.name.trim(),
          type: data.type,
          parent_id: data.parent_id ?? null,
          normal_balance: data.normal_balance,
          is_active: data.is_active,
        },
      });
    } catch (error) {
      const isPrismaConflict =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2002";

      if (isPrismaConflict) {
        throw new ConflictError(`An account with code '${data.code}' already exists`);
      }

      logger.error({ err: error, data }, "Database error creating account");
      throw new InternalServerError("Failed to create account");
    }
  }

  /**
   * Updates an existing account in the database.
   */
  async update(id: string, data: UpdateAccountRepoInput): Promise<Account> {
    try {
      return await prisma.account.update({
        where: { id },
        data: {
          ...(data.code !== undefined ? { code: data.code.trim().toUpperCase() } : {}),
          ...(data.name !== undefined ? { name: data.name.trim() } : {}),
          ...(data.type !== undefined ? { type: data.type } : {}),
          ...(data.parent_id !== undefined ? { parent_id: data.parent_id } : {}),
          ...(data.normal_balance !== undefined ? { normal_balance: data.normal_balance } : {}),
          ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
        },
      });
    } catch (error) {
      const isPrismaError = typeof error === "object" && error !== null && "code" in error;
      if (isPrismaError) {
        const code = (error as { code: string }).code;
        if (code === "P2002") {
          throw new ConflictError(`An account with code '${data.code}' already exists`);
        }
        if (code === "P2025") {
          throw new NotFoundError(`Account with ID '${id}' not found`);
        }
      }

      logger.error({ err: error, accountId: id, data }, "Database error updating account");
      throw new InternalServerError("Failed to update account");
    }
  }

  /**
   * Soft-deactivates an account (sets is_active to false).
   */
  async softDelete(id: string): Promise<Account> {
    try {
      return await prisma.account.update({
        where: { id },
        data: {
          is_active: false,
        },
      });
    } catch (error) {
      const isNotFound =
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code: string }).code === "P2025";

      if (isNotFound) {
        throw new NotFoundError(`Account with ID '${id}' not found`);
      }

      logger.error({ err: error, accountId: id }, "Database error deactivating account");
      throw new InternalServerError("Failed to deactivate account");
    }
  }

  /**
   * Checks whether an account has any associated journal transactions.
   */
  async hasTransactions(id: string): Promise<boolean> {
    try {
      const count = await prisma.journalLine.count({
        where: { account_id: id },
      });
      return count > 0;
    } catch (error) {
      logger.error({ err: error, accountId: id }, "Error checking account transactions");
      throw new InternalServerError("Failed to verify account transaction history");
    }
  }

  /**
   * Checks whether an account has any active child accounts.
   */
  async hasChildren(id: string): Promise<boolean> {
    try {
      const count = await prisma.account.count({
        where: { parent_id: id, is_active: true },
      });
      return count > 0;
    } catch (error) {
      logger.error({ err: error, accountId: id }, "Error checking account child dependencies");
      throw new InternalServerError("Failed to verify account sub-account dependencies");
    }
  }

  /**
   * Returns the total number of accounts in the database.
   */
  async count(): Promise<number> {
    try {
      return await prisma.account.count();
    } catch (error) {
      logger.error({ err: error }, "Error counting accounts");
      throw new InternalServerError("Failed to count accounts");
    }
  }

  async recordAudit(input: AccountAuditInput): Promise<void> {
    try {
      const data: Prisma.AuditLogCreateInput = {
        user_id: input.user_id ?? null,
        action: input.action,
        entity_type: "Account",
        entity_id: input.entity_id,
      };
      if (input.old_value) data.old_value = input.old_value as Prisma.InputJsonValue;
      if (input.new_value) data.new_value = input.new_value as Prisma.InputJsonValue;
      await prisma.auditLog.create({ data });
    } catch (error) {
      // An audit failure must be observable, but must not report a successful
      // account mutation as failed after the database commit.
      logger.error({ err: error, accountId: input.entity_id, action: input.action }, "Failed to write account audit log");
    }
  }
}

export const accountRepository = new AccountRepository();
