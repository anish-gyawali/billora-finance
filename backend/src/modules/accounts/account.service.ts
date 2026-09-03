import type { Account } from "../../generated/prisma/client.js";
import { AccountType, NormalBalance } from "../../generated/prisma/enums.js";
import {
  AccountRepository,
  accountRepository,
  type IAccountRepository,
  type AccountListResult,
} from "./account.repository.js";
import type {
  CreateAccountInput,
  UpdateAccountInput,
  QueryAccountsInput,
} from "./account.validation.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../common/errors/AppError.js";
import { logger } from "../../config/logger.js";

/**
 * Standard 27-account seed Chart of Accounts tailored for a Nepal software consulting/outsourcing company
 */
export const STARTER_COA_SEED: ReadonlyArray<{
  code: string;
  name: string;
  type: AccountType;
  normal_balance: NormalBalance;
}> = [
  // Assets (1000 - 1999)
  { code: "1010", name: "Cash on Hand", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1020", name: "Nabil Bank (NPR Operating)", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1030", name: "Nabil Bank (USD FCY Account)", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1200", name: "Accounts Receivable (Domestic)", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1210", name: "Accounts Receivable (International)", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1300", name: "Advances to Staff", type: AccountType.asset, normal_balance: NormalBalance.debit },
  { code: "1400", name: "Prepaid Expenses", type: AccountType.asset, normal_balance: NormalBalance.debit },

  // Liabilities (2000 - 2999)
  { code: "2010", name: "Accounts Payable (Vendors)", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2020", name: "Reimbursable Payable (Employees)", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2110", name: "VAT Payable", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2120", name: "TDS Payable — Contractor (1.5%/15%)", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2130", name: "TDS Payable — Salary", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2140", name: "TDS Payable — Rent (10%)", type: AccountType.liability, normal_balance: NormalBalance.credit },
  { code: "2200", name: "Salaries & Wages Payable", type: AccountType.liability, normal_balance: NormalBalance.credit },

  // Equity (3000 - 3999)
  { code: "3010", name: "Owner's Capital", type: AccountType.equity, normal_balance: NormalBalance.credit },
  { code: "3020", name: "Retained Earnings", type: AccountType.equity, normal_balance: NormalBalance.credit },

  // Revenue (4000 - 4999)
  { code: "4010", name: "Domestic Software Consulting (NPR)", type: AccountType.revenue, normal_balance: NormalBalance.credit },
  { code: "4020", name: "International Software Outsourcing (USD)", type: AccountType.revenue, normal_balance: NormalBalance.credit },
  { code: "4090", name: "Realized Foreign Exchange (FX) Gain", type: AccountType.revenue, normal_balance: NormalBalance.credit },

  // Expenses (5000 - 5999)
  { code: "5010", name: "Software & Cloud Infrastructure", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5020", name: "Staff Salaries & Compensation", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5030", name: "Contractor & Subcontractor Fees", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5040", name: "Office Rent", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5050", name: "Utilities & Internet", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5060", name: "Bank Fees & SWIFT Wire Charges", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5090", name: "Realized Foreign Exchange (FX) Loss", type: AccountType.expense, normal_balance: NormalBalance.debit },
  { code: "5990", name: "Miscellaneous Office Expenses", type: AccountType.expense, normal_balance: NormalBalance.debit },
];

export class AccountService {
  constructor(private readonly accountRepo: IAccountRepository = accountRepository) {}

  /**
   * Automatically determines the standard accounting normal balance for an account type.
   * Assets & Expenses normally carry Debit balances.
   * Liabilities, Equity & Revenue normally carry Credit balances.
   */
  getDefaultNormalBalance(type: AccountType): NormalBalance {
    if (type === AccountType.asset || type === AccountType.expense) {
      return NormalBalance.debit;
    }
    return NormalBalance.credit;
  }

  /**
   * List all GL accounts with optional filters.
   */
  async listAccounts(filter?: QueryAccountsInput): Promise<AccountListResult> {
    return await this.accountRepo.findAll(filter);
  }

  private async validateParent(
    accountId: string | undefined,
    parentId: string | null,
    accountType: AccountType
  ): Promise<void> {
    if (parentId === null) return;
    if (accountId === parentId) {
      throw new BadRequestError("An account cannot be its own parent");
    }

    const parent = await this.accountRepo.findById(parentId);
    if (!parent) {
      throw new BadRequestError(`Parent account with ID '${parentId}' does not exist`);
    }
    if (!parent.is_active) {
      throw new BadRequestError("Cannot assign an inactive account as parent");
    }
    if (parent.type !== accountType) {
      throw new BadRequestError(
        `Parent account type (${parent.type}) does not match child account type (${accountType})`
      );
    }

    // Walk ancestors to prevent A -> B -> C -> A cycles. The database FK
    // protects existence, while this application check protects hierarchy shape.
    const visited = new Set<string>(accountId ? [accountId] : []);
    let ancestor: Account | null = parent;
    while (ancestor.parent_id) {
      if (visited.has(ancestor.parent_id)) {
        throw new BadRequestError("The selected parent would create an account hierarchy cycle");
      }
      visited.add(ancestor.parent_id);
      ancestor = await this.accountRepo.findById(ancestor.parent_id);
      if (!ancestor) {
        throw new BadRequestError("The account hierarchy contains an invalid parent reference");
      }
    }
  }

  /**
   * Retrieve a single GL account by ID.
   */
  async getAccountById(id: string): Promise<Account> {
    const account = await this.accountRepo.findById(id);
    if (!account) {
      throw new NotFoundError(`Account not found with ID '${id}'`);
    }
    return account;
  }

  /**
   * Create a new GL account.
   */
  async createAccount(input: CreateAccountInput, actorId?: string): Promise<Account> {
    const code = input.code.trim().toUpperCase();

    // 1. Proactive duplicate code check
    const existing = await this.accountRepo.findByCode(code);
    if (existing) {
      throw new ConflictError(`Account with code '${code}' already exists`);
    }

    // 2. Validate parent account if specified
    await this.validateParent(undefined, input.parent_id ?? null, input.type);

    // 3. Determine normal balance (use provided or derive from standard accounting rules)
    const normalBalance = input.normal_balance ?? this.getDefaultNormalBalance(input.type);

    const account = await this.accountRepo.create({
      code,
      name: input.name.trim(),
      type: input.type,
      parent_id: input.parent_id ?? null,
      normal_balance: normalBalance,
      is_active: input.is_active ?? true,
    });
    await this.accountRepo.recordAudit({
      user_id: actorId,
      action: "GL_ACCOUNT_CREATED",
      entity_id: account.id,
      new_value: { code: account.code, name: account.name, type: account.type, is_active: account.is_active },
    });
    return account;
  }

  /**
   * Update an existing GL account.
   * Enforces financial invariants:
   * - Cannot alter code or type if journal transactions are already posted/linked.
   * - An account cannot be its own parent.
   * - Proactive duplicate code collision checks.
   */
  async updateAccount(id: string, input: UpdateAccountInput, actorId?: string): Promise<Account> {
    // 1. Verify account exists
    const existing = await this.getAccountById(id);

    // 2. Prevent account from becoming its own parent
    // 3. Invariant check: Check if transactions exist before allowing code or type modification
    const isCodeChanged = input.code !== undefined && input.code.trim() !== existing.code;
    const isTypeChanged = input.type !== undefined && input.type !== existing.type;

    if (isCodeChanged || isTypeChanged) {
      const hasTransactions = await this.accountRepo.hasTransactions(id);
      if (hasTransactions) {
        throw new BadRequestError(
          "Cannot alter account code or account type because journal transactions are already linked to this account"
        );
      }
    }

    // 4. If code is changed, verify uniqueness
    if (isCodeChanged && input.code) {
      const duplicateCode = await this.accountRepo.findByCode(input.code.trim().toUpperCase());
      if (duplicateCode && duplicateCode.id !== id) {
        throw new ConflictError(`Account with code '${input.code.trim()}' already exists`);
      }
    }

    const targetType = input.type ?? existing.type;
    const targetParent = input.parent_id !== undefined ? input.parent_id : existing.parent_id;
    await this.validateParent(id, targetParent, targetType);

    if (input.is_active === false && existing.is_active) {
      const hasChildren = await this.accountRepo.hasChildren(id);
      if (hasChildren) {
        throw new BadRequestError(
          "Cannot deactivate account with active sub-accounts. Please deactivate or reassign sub-accounts first."
        );
      }
    }

    const account = await this.accountRepo.update(id, {
      ...(input.code !== undefined ? { code: input.code.trim().toUpperCase() } : {}),
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.type !== undefined ? { type: input.type } : {}),
      ...(input.parent_id !== undefined ? { parent_id: input.parent_id } : {}),
      ...(input.normal_balance !== undefined ? { normal_balance: input.normal_balance } : {}),
      ...(input.is_active !== undefined ? { is_active: input.is_active } : {}),
    });
    await this.accountRepo.recordAudit({
      user_id: actorId,
      action: "GL_ACCOUNT_UPDATED",
      entity_id: id,
      old_value: { code: existing.code, name: existing.name, type: existing.type, parent_id: existing.parent_id, normal_balance: existing.normal_balance, is_active: existing.is_active },
      new_value: { code: account.code, name: account.name, type: account.type, parent_id: account.parent_id, normal_balance: account.normal_balance, is_active: account.is_active },
    });
    return account;
  }

  /**
   * Soft deactivates an account (sets is_active to false).
   * Guards against deactivating parent accounts that have active sub-accounts.
   */
  async deactivateAccount(id: string, actorId?: string): Promise<Account> {
    // 1. Verify account exists
    const account = await this.getAccountById(id);

    if (!account.is_active) {
      return account; // Already deactivated (idempotent)
    }

    // 2. Check for active child accounts
    const hasChildren = await this.accountRepo.hasChildren(id);
    if (hasChildren) {
      throw new BadRequestError(
        "Cannot deactivate account with active sub-accounts. Please deactivate or reassign sub-accounts first."
      );
    }

    const deactivated = await this.accountRepo.softDelete(id);
    await this.accountRepo.recordAudit({
      user_id: actorId,
      action: "GL_ACCOUNT_DEACTIVATED",
      entity_id: id,
      old_value: { code: account.code, name: account.name, is_active: true },
      new_value: { code: deactivated.code, name: deactivated.name, is_active: false },
    });
    return deactivated;
  }

  /**
   * Seeds the starter Chart of Accounts (27 standard accounts) if none exist,
   * Existing accounts are preserved so deployment seeding cannot overwrite
   * company-specific names, hierarchy, or configuration.
   */
  async seedStarterCOA(): Promise<{ seededCount: number; accounts: Account[] }> {
    logger.info("Checking starter Chart of Accounts seeding...");
    const accounts: Account[] = [];
    let seededCount = 0;

    for (const seedItem of STARTER_COA_SEED) {
      const existing = await this.accountRepo.findByCode(seedItem.code);
      if (!existing) {
        const created = await this.accountRepo.create({
          code: seedItem.code,
          name: seedItem.name,
          type: seedItem.type,
          parent_id: null,
          normal_balance: seedItem.normal_balance,
          is_active: true,
        });
        accounts.push(created);
        seededCount++;
      } else {
        accounts.push(existing);
      }
    }

    logger.info({ seededCount, totalAccounts: accounts.length }, "Starter COA seed completed");
    return { seededCount, accounts };
  }
}

export const accountService = new AccountService();
