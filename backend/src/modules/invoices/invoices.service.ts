import { Prisma } from "../../generated/prisma/client.js";
import type { Invoice } from "../../generated/prisma/client.js";
import { BadRequestError, ConflictError, NotFoundError } from "../../common/errors/AppError.js";
import { invoicesRepository } from "./invoices.repository.js";
import type { IInvoicesRepository, InvoiceDetails } from "./invoices.repository.interface.js";
import type { CreateInvoiceInput, CreatePaymentInput, QueryInvoicesInput, UpdateInvoiceInput } from "./invoices.validation.js";

const money = (value: number | Prisma.Decimal) => new Prisma.Decimal(String(value));
const date = (value: string) => new Date(`${value}T00:00:00.000Z`);

export class InvoicesService {
  constructor(private readonly repository: IInvoicesRepository = invoicesRepository) {}

  async create(input: CreateInvoiceInput, actorId: string): Promise<InvoiceDetails> {
    const client = await this.repository.findActiveClient(input.client_id);
    if (!client) throw new NotFoundError("Active client was not found");
    this.validateCurrency(input.currency, input.exchange_rate_to_npr);
    const total = this.calculateTotal(input.invoice_items);
    const invoice = await this.repository.create(input, total);
    await this.audit(actorId, "INVOICE_CREATED", invoice.id, undefined, { invoice_number: invoice.invoice_number, total_amount: total.toString() });
    return invoice;
  }

  list(input: QueryInvoicesInput) { return this.repository.findAll(input); }

  async get(id: string): Promise<InvoiceDetails> {
    const invoice = await this.repository.findById(id);
    if (!invoice) throw new NotFoundError(`Invoice with ID '${id}' not found`);
    return invoice;
  }

  async update(id: string, input: UpdateInvoiceInput, actorId: string): Promise<InvoiceDetails> {
    const current = await this.get(id);
    if (current.status !== "draft") throw new ConflictError("Only draft invoices can be edited");
    const currency = input.currency ?? current.currency;
    const exchangeRate = input.exchange_rate_to_npr !== undefined ? input.exchange_rate_to_npr : current.exchange_rate_to_npr;
    this.validateCurrency(currency, exchangeRate);
    const finalInvoiceDate = input.invoice_date ?? current.invoice_date.toISOString().slice(0, 10);
    const finalDueDate = input.due_date ?? current.due_date.toISOString().slice(0, 10);
    if (finalDueDate < finalInvoiceDate) throw new BadRequestError("Due date cannot be before invoice date");
    const total = input.invoice_items ? this.calculateTotal(input.invoice_items) : money(current.total_amount);
    const updated = await this.repository.updateDraft(id, input, total);
    await this.audit(actorId, "INVOICE_UPDATED", id, { status: current.status, total_amount: current.total_amount.toString() }, { status: updated.status, total_amount: updated.total_amount.toString() });
    return updated;
  }

  async send(id: string, actorId: string): Promise<InvoiceDetails> {
    const current = await this.get(id);
    if (current.status !== "draft") throw new ConflictError("Only draft invoices can be sent");
    const invoice = await this.repository.send(id, actorId);
    await this.audit(actorId, "INVOICE_SENT", id, { status: current.status }, { status: invoice.status });
    return invoice;
  }

  async pay(id: string, input: CreatePaymentInput, actorId: string): Promise<{ invoice: InvoiceDetails; payment: InvoicePaymentResult; fx_difference_npr: string | null }> {
    const current = await this.get(id);
    if (current.status === "void") throw new ConflictError("Void invoices cannot receive payments");
    if (current.status === "draft") throw new ConflictError("Draft invoices must be sent before receiving payments");
    if (input.currency !== current.currency) throw new BadRequestError("Payment currency must match invoice currency");
    if (!(await this.repository.findActiveAccount(input.account_id))) throw new BadRequestError("Payment account does not exist or is inactive");
    const amount = money(input.amount);
    const remaining = money(current.total_amount).minus(money(current.paid_amount));
    if (amount.gt(remaining)) throw new BadRequestError("Payment exceeds the remaining invoice balance");
    const result = await this.repository.recordPayment(id, input);
    const paidAmount = result.paidAmount;
    const status = result.status;
    const fx = current.currency === "USD" && input.actual_npr_amount != null && current.exchange_rate_to_npr != null
      ? money(input.actual_npr_amount).minus(amount.mul(money(current.exchange_rate_to_npr))).toString()
      : null;
    await this.audit(actorId, "INVOICE_PAYMENT_RECORDED", id, { paid_amount: current.paid_amount.toString(), status: current.status }, { paid_amount: paidAmount.toString(), status });
    return { invoice: result.invoice, payment: result.payment, fx_difference_npr: fx };
  }

  async void(id: string, actorId: string): Promise<InvoiceDetails> {
    const current = await this.get(id);
    if (current.status === "paid") throw new ConflictError("A fully paid invoice cannot be voided");
    if (money(current.paid_amount).gt(0)) throw new ConflictError("An invoice with partial payments cannot be voided; reverse or refund its payments first");
    const invoice = await this.repository.void(id);
    await this.audit(actorId, "INVOICE_VOIDED", id, { status: current.status }, { status: invoice.status });
    return invoice;
  }

  async overdue(): Promise<InvoiceAgingRow[]> { return (await this.toAging(await this.repository.findAging())).filter((row) => row.days_overdue > 0); }
  async aging(): Promise<InvoiceAgingRow[]> { return this.toAging(await this.repository.findAging()); }

  private calculateTotal(items: CreateInvoiceInput["invoice_items"]): Prisma.Decimal {
    return items.reduce((total, item) => total.plus(money(item.quantity).mul(money(item.rate)).plus(item.vat_amount == null ? 0 : money(item.vat_amount))), money(0));
  }

  private validateCurrency(currency: string, rate: number | Prisma.Decimal | null | undefined): void {
    if (currency === "NPR" && rate != null) throw new BadRequestError("NPR invoices must not have an exchange rate");
    if (currency === "USD" && (rate == null || !money(rate).gt(0))) throw new BadRequestError("USD invoices require an exchange rate greater than zero");
  }

  private toAging(invoices: InvoiceDetails[]): InvoiceAgingRow[] {
    const today = startOfToday();
    return invoices.filter((invoice) => money(invoice.total_amount).gt(money(invoice.paid_amount))).map((invoice) => {
      const daysOverdue = Math.max(0, Math.floor((today.getTime() - startOfDay(invoice.due_date).getTime()) / 86400000));
      return { invoice, remaining_balance: money(invoice.total_amount).minus(money(invoice.paid_amount)).toString(), days_overdue: daysOverdue, aging_bucket: daysOverdue === 0 ? "Current" : daysOverdue <= 30 ? "1-30 days" : daysOverdue <= 60 ? "31-60 days" : daysOverdue <= 90 ? "61-90 days" : "90+ days" };
    });
  }

  private async audit(actorId: string, action: string, id: string, old_value?: Record<string, unknown>, new_value?: Record<string, unknown>) { await this.repository.recordAudit({ user_id: actorId, action, entity_id: id, ...(old_value ? { old_value } : {}), ...(new_value ? { new_value } : {}) }); }
}

export interface InvoiceAgingRow { invoice: InvoiceDetails; remaining_balance: string; days_overdue: number; aging_bucket: string; }
export type InvoicePaymentResult = Awaited<ReturnType<IInvoicesRepository["recordPayment"]>>["payment"];
const startOfDay = (value: Date) => new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
const startOfToday = () => startOfDay(new Date());
export const invoicesService = new InvoicesService();
