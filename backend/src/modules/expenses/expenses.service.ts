import { Prisma } from "../../generated/prisma/client.js";
import type { Expense } from "../../generated/prisma/client.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError.js";
import { expensesRepository, type ExpenseDetails, type IExpensesRepository } from "./expenses.repository.js";
import type { CreateExpenseInput, QueryExpensesInput, UpdateExpenseInput } from "./expenses.validation.js";

const money = (value: number | Prisma.Decimal) => new Prisma.Decimal(String(value));
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);

export class ExpensesService {
  constructor(private readonly repository: IExpensesRepository = expensesRepository) {}

  async create(input: CreateExpenseInput, actor: { userId: string; role: string }): Promise<ExpenseDetails> {
    const paidBy = actor.role === "member" ? (input.payment_account_id ? null : input.paid_by_user_id ?? actor.userId) : input.paid_by_user_id ?? null;
    if (actor.role === "member" && input.paid_by_user_id && input.paid_by_user_id !== actor.userId) throw new ForbiddenError("Members may only submit expenses for themselves");
    await this.validateReferences(input, paidBy);
    if (input.payment_account_id && paidBy) throw new BadRequestError("Use either payment_account_id or paid_by_user_id, not both");
    const expense = await this.repository.create(input, paidBy);
    await this.audit(actor.userId, "EXPENSE_CREATED", expense.id, { status: expense.status, total_amount: expense.total_amount.toString() });
    return expense;
  }

  list(input: QueryExpensesInput, actor: { userId: string; role: string }) { return this.repository.findAll(input, { id: actor.userId, role: actor.role }); }

  async get(id: string, actor: { userId: string; role: string }): Promise<ExpenseDetails> {
    const expense = await this.repository.findById(id);
    if (!expense) throw new NotFoundError(`Expense with ID '${id}' not found`);
    this.assertOwner(expense, actor);
    return expense;
  }

  async update(id: string, input: UpdateExpenseInput, actor: { userId: string; role: string }): Promise<ExpenseDetails> {
    const current = await this.get(id, actor);
    if (current.status !== "draft") throw new ConflictError("Only draft expenses can be edited");
    const finalPaidBy = input.paid_by_user_id !== undefined ? (actor.role === "member" ? input.paid_by_user_id ?? actor.userId : input.paid_by_user_id ?? null) : current.paid_by_user_id;
    if (actor.role === "member" && finalPaidBy !== actor.userId) throw new ForbiddenError("Members may only submit expenses for themselves");
    if (input.vendor_id !== undefined && input.vendor_id && !(await this.repository.findVendor(input.vendor_id))) throw new BadRequestError("Vendor does not exist");
    if (input.payment_account_id !== undefined && input.payment_account_id && !(await this.validPaymentAccount(input.payment_account_id))) throw new BadRequestError("Payment account does not exist or is inactive");
    if (input.paid_by_user_id !== undefined && finalPaidBy && !(await this.validUser(finalPaidBy))) throw new BadRequestError("Paid-by user does not exist or is inactive");
    const finalPaymentAccount = input.payment_account_id !== undefined ? input.payment_account_id : current.payment_account_id;
    if (finalPaymentAccount && finalPaidBy) throw new BadRequestError("Use either payment_account_id or paid_by_user_id, not both");
    const expense = await this.repository.updateDraft(id, input, finalPaidBy);
    await this.audit(actor.userId, "EXPENSE_UPDATED", id, { status: current.status, total_amount: current.total_amount.toString() }, { status: expense.status, total_amount: expense.total_amount.toString() });
    return expense;
  }

  async approve(id: string, actorId: string): Promise<ExpenseDetails> { const current = await this.repository.findById(id); if (!current) throw new NotFoundError(`Expense with ID '${id}' not found`); if (current.status !== "draft") throw new ConflictError("Only draft expenses can be approved"); const expense = await this.repository.approve(id, actorId); await this.audit(actorId, "EXPENSE_APPROVED", id, { status: current.status }, { status: expense.status, approved_by: actorId }); return expense; }
  async post(id: string, actorId: string): Promise<ExpenseDetails> { const current = await this.repository.findById(id); if (!current) throw new NotFoundError(`Expense with ID '${id}' not found`); if (current.status !== "approved") throw new ConflictError("Only approved expenses can be posted"); const expense = await this.repository.post(id, actorId); await this.audit(actorId, "EXPENSE_POSTED", id, { status: current.status }, { status: expense.status, journal_entry_id: expense.journal_entry_id }); return expense; }

  private async validateReferences(input: CreateExpenseInput, paidBy: string | null) {
    if (input.vendor_id && !(await this.repository.findVendor(input.vendor_id))) throw new BadRequestError("Vendor does not exist");
    if (paidBy && !(await this.validUser(paidBy))) throw new BadRequestError("Paid-by user does not exist or is inactive");
    if (input.payment_account_id && !(await this.validPaymentAccount(input.payment_account_id))) throw new BadRequestError("Payment account does not exist or is inactive");
    if (input.payment_account_id && paidBy) throw new BadRequestError("Use either payment_account_id or paid_by_user_id, not both");
    const uniqueIds = [...new Set(input.expense_items.map((item) => item.account_id))];
    for (const accountId of uniqueIds) { const account = await this.repository.findAccount(accountId); if (!account) throw new BadRequestError(`Expense account '${accountId}' does not exist`); if (!account.is_active) throw new BadRequestError(`Expense account '${accountId}' is inactive`); if (account.type !== "expense") throw new BadRequestError(`Account '${accountId}' is not an expense account`); }
  }
  private async validUser(id: string) { const user = await this.repository.findUser(id); return Boolean(user?.is_active); }
  private async validPaymentAccount(id: string) { const account = await this.repository.findAccount(id); return Boolean(account?.is_active); }
  private assertOwner(expense: ExpenseDetails, actor: { userId: string; role: string }) { if (actor.role === "member" && expense.paid_by_user_id !== actor.userId) throw new ForbiddenError("You may only access your own expenses"); }
  private async audit(userId: string, action: string, id: string, old_value?: Record<string, unknown>, new_value?: Record<string, unknown>) { await this.repository.recordAudit({ user_id: userId, action, entity_id: id, ...(old_value ? { old_value } : {}), ...(new_value ? { new_value } : {}) }); }
}
export const expensesService = new ExpensesService();
