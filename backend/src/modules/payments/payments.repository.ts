import { Prisma, type Account, type Payment } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { ConflictError, BadRequestError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import { logger } from "../../config/logger.js";
import type { CreatePaymentInput, QueryPaymentsInput, UpdatePaymentInput } from "./payments.validation.js";
import type { IPaymentsRepository, PaymentRecord } from "./payments.repository.interface.js";

const d = (value: number | Prisma.Decimal) => new Prisma.Decimal(String(value));
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const include = { account: true } as const;

export class PaymentsRepository implements IPaymentsRepository {
  async create(input: CreatePaymentInput): Promise<PaymentRecord> {
    try { return await prisma.$transaction(async (tx) => { const payment = await this.applyPayment(tx, null, input); return payment; }, { isolationLevel: "Serializable" }); }
    catch (error) { return this.mapError(error, "Failed to create payment"); }
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    try { return prisma.payment.findUnique({ where: { id }, include }); }
    catch (error) { logger.error({ err: error, paymentId: id }, "Failed to fetch payment"); throw new InternalServerError("Failed to fetch payment"); }
  }

  async findAll(input: QueryPaymentsInput): Promise<{ payments: PaymentRecord[]; total: number }> {
    try { const where: Prisma.PaymentWhereInput = { ...(input.direction ? { direction: input.direction } : {}), ...(input.currency ? { currency: input.currency } : {}), ...(input.account_id ? { account_id: input.account_id } : {}), ...(input.method ? { method: input.method } : {}), ...(input.allocated_to_type ? { allocated_to_type: input.allocated_to_type } : {}), ...(input.allocated_to_id ? { allocated_to_id: input.allocated_to_id } : {}), ...(input.payment_date_from || input.payment_date_to ? { payment_date: { ...(input.payment_date_from ? { gte: day(input.payment_date_from) } : {}), ...(input.payment_date_to ? { lte: day(input.payment_date_to) } : {}) } } : {}) }; const [payments, total] = await prisma.$transaction([prisma.payment.findMany({ where, include, orderBy: [{ payment_date: "desc" }, { created_at: "desc" }], skip: (input.page - 1) * input.limit, take: input.limit }), prisma.payment.count({ where })]); return { payments, total }; }
    catch (error) { logger.error({ err: error }, "Failed to list payments"); throw new InternalServerError("Failed to list payments"); }
  }

  async update(id: string, input: UpdatePaymentInput): Promise<PaymentRecord> {
    try { return await prisma.$transaction(async (tx) => { await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${id} FOR UPDATE`; const current = await tx.payment.findUnique({ where: { id } }); if (!current) throw new NotFoundError(`Payment with ID '${id}' not found`); if (current.journal_entry_id) throw new ConflictError("Payments linked to journal entries cannot be edited"); const nextType = (input.allocated_to_type ?? current.allocated_to_type) as "invoice" | "vendor_expense" | "salary_run" | "direct"; const next: CreatePaymentInput = { direction: input.direction ?? current.direction, amount: input.amount ?? Number(current.amount), currency: (input.currency ?? current.currency) as "NPR" | "USD", payment_date: input.payment_date ?? current.payment_date.toISOString().slice(0, 10), account_id: input.account_id ?? current.account_id, method: input.method ?? current.method, allocated_to_type: nextType, allocated_to_id: nextType === "direct" ? null : input.allocated_to_id !== undefined ? input.allocated_to_id : current.allocated_to_id, journal_entry_id: null, actual_npr_amount: input.actual_npr_amount !== undefined ? input.actual_npr_amount : current.actual_npr_amount == null ? null : Number(current.actual_npr_amount) }; await this.removePaymentEffect(tx, current); const payment = await this.applyPayment(tx, id, next); return payment; }, { isolationLevel: "Serializable" }); }
    catch (error) { return this.mapError(error, "Failed to update payment"); }
  }

  async findAccount(id: string): Promise<{ id: string; is_active: boolean } | null> { try { return prisma.account.findUnique({ where: { id }, select: { id: true, is_active: true } }); } catch (error) { logger.error({ err: error, accountId: id }, "Failed to validate payment account"); throw new InternalServerError("Failed to validate payment account"); } }

  async resolveAllocation(type: string, id: string | null): Promise<unknown> {
    if (type === "direct" || !id) return null;
    if (type === "invoice") return prisma.invoice.findUnique({ where: { id }, select: { id: true, invoice_number: true, status: true, total_amount: true, paid_amount: true, currency: true, client: { select: { id: true, name: true } } } });
    if (type === "vendor_expense") return prisma.expense.findUnique({ where: { id }, select: { id: true, status: true, total_amount: true, expense_date: true, vendor: { select: { id: true, name: true } } } });
    if (type === "salary_run") return prisma.salaryRun.findUnique({ where: { id }, select: { id: true, status: true, period_start: true, period_end: true, items: { select: { net_amount: true } } } });
    return null;
  }

  async recordAudit(input: { user_id?: string; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown> }): Promise<void> { try { const data: Prisma.AuditLogCreateInput = { user_id: input.user_id ?? null, action: input.action, entity_type: "Payment", entity_id: input.entity_id }; if (input.old_value) data.old_value = input.old_value as Prisma.InputJsonValue; if (input.new_value) data.new_value = input.new_value as Prisma.InputJsonValue; await prisma.auditLog.create({ data }); } catch (error) { logger.error({ err: error, paymentId: input.entity_id, action: input.action }, "Failed to write payment audit log"); } }

  private async applyPayment(tx: Prisma.TransactionClient, excludingId: string | null, input: CreatePaymentInput): Promise<PaymentRecord> {
    await this.validateTarget(tx, excludingId, input);
    const payment = await tx.payment.create({ data: { direction: input.direction, amount: d(input.amount), currency: input.currency, payment_date: day(input.payment_date), account_id: input.account_id, method: input.method, allocated_to_type: input.allocated_to_type, allocated_to_id: input.allocated_to_id ?? null, journal_entry_id: input.journal_entry_id ?? null, actual_npr_amount: input.actual_npr_amount == null ? null : d(input.actual_npr_amount) }, include });
    if (input.allocated_to_type === "invoice" && input.allocated_to_id) await this.adjustInvoice(tx, input.allocated_to_id, d(input.amount));
    return payment;
  }

  private async validateTarget(tx: Prisma.TransactionClient, excludingId: string | null, input: CreatePaymentInput): Promise<void> {
    const account = await tx.account.findFirst({ where: { id: input.account_id, is_active: true } }); if (!account) throw new BadRequestError("Payment account does not exist or is inactive");
    if (input.journal_entry_id && !(await tx.journalEntry.findUnique({ where: { id: input.journal_entry_id }, select: { id: true } }))) throw new NotFoundError("Journal entry was not found");
    if (input.allocated_to_type === "direct") return;
    if (!input.allocated_to_id) throw new BadRequestError("An allocation ID is required");
    if (input.allocated_to_type === "invoice") { const invoice = await tx.invoice.findUnique({ where: { id: input.allocated_to_id } }); if (!invoice) throw new NotFoundError("Invoice allocation target was not found"); if (input.direction !== "in") throw new BadRequestError("Invoice payments must be incoming"); if (invoice.status === "void" || invoice.status === "draft") throw new ConflictError("Only sent or overdue invoices can receive payments"); if (invoice.currency !== input.currency) throw new BadRequestError("Payment currency must match invoice currency"); const paid = await tx.payment.aggregate({ where: { allocated_to_type: "invoice", allocated_to_id: invoice.id, direction: "in", ...(excludingId ? { NOT: { id: excludingId } } : {}) }, _sum: { amount: true } }); if (d(paid._sum.amount ?? 0).plus(d(input.amount)).gt(d(invoice.total_amount))) throw new BadRequestError("Payment exceeds the invoice remaining balance"); return; }
    if (input.allocated_to_type === "vendor_expense") { const expense = await tx.expense.findUnique({ where: { id: input.allocated_to_id } }); if (!expense) throw new NotFoundError("Expense allocation target was not found"); if (expense.status === "reversed") throw new ConflictError("Reversed expenses cannot receive payments"); const paid = await tx.payment.aggregate({ where: { allocated_to_type: "vendor_expense", allocated_to_id: expense.id, direction: "out", ...(excludingId ? { NOT: { id: excludingId } } : {}) }, _sum: { amount: true } }); if (d(paid._sum.amount ?? 0).plus(d(input.amount)).gt(d(expense.total_amount))) throw new BadRequestError("Payment exceeds the expense remaining balance"); if (input.direction !== "out") throw new BadRequestError("Vendor expense payments must be outgoing"); return; }
    if (input.allocated_to_type === "salary_run") { const salary = await tx.salaryRun.findUnique({ where: { id: input.allocated_to_id }, include: { items: { select: { net_amount: true } } } }); if (!salary) throw new NotFoundError("Salary run allocation target was not found"); const total = salary.items.reduce((sum, item) => sum.plus(d(item.net_amount)), new Prisma.Decimal(0)); const paid = await tx.payment.aggregate({ where: { allocated_to_type: "salary_run", allocated_to_id: salary.id, direction: "out", ...(excludingId ? { NOT: { id: excludingId } } : {}) }, _sum: { amount: true } }); if (d(paid._sum.amount ?? 0).plus(d(input.amount)).gt(total)) throw new BadRequestError("Payment exceeds the salary run remaining balance"); if (input.direction !== "out") throw new BadRequestError("Salary payments must be outgoing"); }
  }

  private async removePaymentEffect(tx: Prisma.TransactionClient, current: Payment): Promise<void> { if (current.allocated_to_type === "invoice" && current.allocated_to_id) await this.adjustInvoice(tx, current.allocated_to_id, d(current.amount).neg()); }
  private async adjustInvoice(tx: Prisma.TransactionClient, id: string, delta: Prisma.Decimal): Promise<void> { await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`; const invoice = await tx.invoice.findUnique({ where: { id } }); if (!invoice) throw new NotFoundError("Invoice allocation target was not found"); if (invoice.status === "void") throw new ConflictError("Void invoices cannot be adjusted"); const paid = d(invoice.paid_amount).plus(delta); if (paid.lt(0)) throw new BadRequestError("Invoice paid amount cannot become negative"); const status = paid.eq(0) ? "sent" : paid.eq(invoice.total_amount) ? "paid" : "partially_paid"; await tx.invoice.update({ where: { id }, data: { paid_amount: paid, status } }); }
  private mapError(error: unknown, message: string): never { if (error instanceof ConflictError || error instanceof BadRequestError || error instanceof NotFoundError) throw error; logger.error({ err: error }, message); throw new InternalServerError(message); }
}
export const paymentsRepository = new PaymentsRepository();
