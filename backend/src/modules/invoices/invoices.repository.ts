import { Prisma, type Invoice, type InvoiceItem, type Payment } from "../../generated/prisma/client.js";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../config/logger.js";
import { postJournalEntry } from "../../lib/accounting/postJournalEntry.js";
import { ConflictError, InternalServerError, NotFoundError } from "../../common/errors/AppError.js";
import type { CreateInvoiceInput, CreatePaymentInput, QueryInvoicesInput, UpdateInvoiceInput } from "./invoices.validation.js";
import type { IInvoicesRepository, InvoiceDetails } from "./invoices.repository.interface.js";

const clientSelect = { id: true, name: true, country: true, billing_email: true, currency: true } as const;

export class InvoicesRepository implements IInvoicesRepository {
  async create(input: CreateInvoiceInput, total: Prisma.Decimal): Promise<InvoiceDetails> {
    try {
      return await prisma.$transaction(async (tx) => {
        const client = await tx.client.findFirst({ where: { id: input.client_id, is_active: true }, select: { id: true } });
        if (!client) throw new NotFoundError("Active client was not found");
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('billora_invoice_number'))`;
        const year = input.invoice_date.slice(0, 4);
        const prefix = `INV-${year}-`;
        const last = await tx.invoice.findFirst({ where: { invoice_number: { startsWith: prefix } }, orderBy: { invoice_number: "desc" }, select: { invoice_number: true } });
        const next = last ? Number(last.invoice_number.slice(prefix.length)) + 1 : 1;
        const invoiceNumber = `${prefix}${String(next).padStart(3, "0")}`;
        const invoice = await tx.invoice.create({
          data: {
            client_id: input.client_id,
            invoice_number: invoiceNumber,
            invoice_date: toDate(input.invoice_date),
            due_date: toDate(input.due_date),
            currency: input.currency,
            exchange_rate_to_npr: input.exchange_rate_to_npr == null ? null : decimal(input.exchange_rate_to_npr),
            status: "draft",
            total_amount: total,
            paid_amount: new Prisma.Decimal(0),
            items: { create: input.invoice_items.map((item) => ({ description: item.description, quantity: item.quantity, rate: decimal(item.rate), amount: decimal(item.quantity).mul(decimal(item.rate)), vat_amount: item.vat_amount == null ? null : decimal(item.vat_amount) })) },
          },
          include: { client: { select: clientSelect }, items: true },
        });
        return withPayments(tx, invoice);
      });
    } catch (error) { return this.mapError(error, "Failed to create invoice"); }
  }

  async findById(id: string): Promise<InvoiceDetails | null> {
    try {
      const invoice = await prisma.invoice.findUnique({ where: { id }, include: { client: { select: clientSelect }, items: true } });
      return invoice ? withPayments(prisma, invoice) : null;
    } catch (error) { logger.error({ err: error, invoiceId: id }, "Failed to fetch invoice"); throw new InternalServerError("Failed to fetch invoice"); }
  }

  async findAll(input: QueryInvoicesInput): Promise<{ invoices: InvoiceDetails[]; total: number }> {
    try {
      const where: Prisma.InvoiceWhereInput = {
        ...(input.client_id ? { client_id: input.client_id } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.currency ? { currency: input.currency } : {}),
        ...(input.invoice_date_from || input.invoice_date_to ? { invoice_date: { ...(input.invoice_date_from ? { gte: toDate(input.invoice_date_from) } : {}), ...(input.invoice_date_to ? { lte: toDate(input.invoice_date_to) } : {}) } } : {}),
      };
      const [rows, total] = await prisma.$transaction([
        prisma.invoice.findMany({ where, include: { client: { select: clientSelect }, items: true }, orderBy: [{ invoice_date: "desc" }, { created_at: "desc" }], skip: (input.page - 1) * input.limit, take: input.limit }),
        prisma.invoice.count({ where }),
      ]);
      return { invoices: await Promise.all(rows.map((row) => withPayments(prisma, row))), total };
    } catch (error) { logger.error({ err: error, input }, "Failed to list invoices"); throw new InternalServerError("Failed to list invoices"); }
  }

  async updateDraft(id: string, input: UpdateInvoiceInput, total: Prisma.Decimal): Promise<InvoiceDetails> {
    try {
      return await prisma.$transaction(async (tx) => {
        const current = await tx.invoice.findUnique({ where: { id }, select: { status: true } });
        if (!current) throw new NotFoundError(`Invoice with ID '${id}' not found`);
        if (current.status !== "draft") throw new ConflictError("Only draft invoices can be edited");
        if (input.invoice_items) await tx.invoiceItem.deleteMany({ where: { invoice_id: id } });
        const invoice = await tx.invoice.update({ where: { id }, data: { ...(input.invoice_date ? { invoice_date: toDate(input.invoice_date) } : {}), ...(input.due_date ? { due_date: toDate(input.due_date) } : {}), ...(input.currency ? { currency: input.currency } : {}), ...(input.exchange_rate_to_npr !== undefined ? { exchange_rate_to_npr: input.exchange_rate_to_npr == null ? null : decimal(input.exchange_rate_to_npr) } : {}), ...(input.invoice_items ? { total_amount: total, items: { create: input.invoice_items.map((item) => ({ description: item.description, quantity: item.quantity, rate: decimal(item.rate), amount: decimal(item.quantity).mul(decimal(item.rate)), vat_amount: item.vat_amount == null ? null : decimal(item.vat_amount) })) } } : {}), ...(input.invoice_items ? {} : {}) }, include: { client: { select: clientSelect }, items: true } });
        return withPayments(tx, invoice);
      });
    } catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, invoiceId: id }, "Failed to update invoice"); throw new InternalServerError("Failed to update invoice"); }
  }

  async send(id: string, actorId: string): Promise<InvoiceDetails> {
    try { return await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
      const invoice = await tx.invoice.findUnique({ where: { id }, include: { client: { select: clientSelect }, items: true } });
      if (!invoice) throw new NotFoundError(`Invoice with ID '${id}' not found`);
      if (invoice.status !== "draft") throw new ConflictError("Only draft invoices can be sent");
      const period = await tx.accountingPeriod.findFirst({ where: { status: "open", period_start: { lte: invoice.invoice_date }, period_end: { gte: invoice.invoice_date } } });
      if (!period) throw new ConflictError("No open accounting period covers the invoice date");
      const ar = await findAccountByCode(tx, invoice.currency === "NPR" ? "1200" : "1210");
      const revenue = await findAccountByCode(tx, invoice.currency === "NPR" ? "4010" : "4020");
      if (!ar || !revenue) throw new ConflictError("Invoice posting requires the configured receivable and revenue accounts");
      const rate = invoice.currency === "NPR" ? new Prisma.Decimal(1) : invoice.exchange_rate_to_npr ?? new Prisma.Decimal(0);
      if (rate.lte(0)) throw new ConflictError("A valid NPR exchange rate is required before issuing a foreign-currency invoice");
      const base = invoice.items.reduce((s, item) => s.plus(decimal(item.amount)), new Prisma.Decimal(0));
      const vat = invoice.items.reduce((s, item) => s.plus(decimal(item.vat_amount ?? 0)), new Prisma.Decimal(0));
      const lines = [{ account_id: ar.id, debit: decimal(invoice.total_amount).mul(rate), description: "Accounts receivable" }, { account_id: revenue.id, credit: base.mul(rate), description: "Invoice revenue" }];
      if (vat.gt(0)) { const vatAccount = await findAccountByCode(tx, "2110"); if (!vatAccount) throw new ConflictError("VAT payable account is required before posting VAT invoices"); lines.push({ account_id: vatAccount.id, credit: vat.mul(rate), description: "Output VAT" }); }
      const journal = await postJournalEntry(tx, { entry_date: invoice.invoice_date, period_id: period.id, source_type: "invoice", source_id: invoice.id, created_by: actorId, memo: `Invoice posting ${invoice.invoice_number}`, lines });
      const updated = await tx.invoice.update({ where: { id }, data: { status: "sent", journal_entry_id: journal.id }, include: { client: { select: clientSelect }, items: true } });
      return withPayments(tx, updated);
    }); } catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, invoiceId: id }, "Failed to issue invoice"); throw new InternalServerError("Failed to issue invoice"); }
  }

  async void(id: string, actorId: string): Promise<InvoiceDetails> { try { return await prisma.$transaction(async (tx) => { await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`; const current = await tx.invoice.findUnique({ where: { id }, include: { client: { select: clientSelect }, items: true } }); if (!current) throw new NotFoundError(`Invoice with ID '${id}' not found`); if (current.status === "paid" || current.status === "void" || current.paid_amount.gt(0)) throw new ConflictError("Only unpaid invoices can be voided"); if (current.journal_entry_id) { const original = await tx.journalEntry.findUnique({ where: { id: current.journal_entry_id }, include: { lines: true } }); if (!original || original.status !== "posted") throw new ConflictError("The invoice journal entry cannot be reversed"); const period = await tx.accountingPeriod.findFirst({ where: { status: "open", period_start: { lte: current.invoice_date }, period_end: { gte: current.invoice_date } } }); if (!period) throw new ConflictError("The invoice period is closed; create a manual reversal in an open period"); await tx.journalEntry.update({ where: { id: original.id }, data: { status: "reversed" } }); await postJournalEntry(tx, { entry_date: current.invoice_date, period_id: period.id, source_type: "reversal", source_id: original.id, created_by: actorId, memo: `Reversal of invoice ${current.invoice_number}`, lines: original.lines.map((line) => ({ account_id: line.account_id, debit: line.credit, credit: line.debit, description: `Reversal: ${line.description ?? "Invoice"}` })) }); } const invoice = await tx.invoice.update({ where: { id }, data: { status: "void" }, include: { client: { select: clientSelect }, items: true } }); return withPayments(tx, invoice); }); } catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, invoiceId: id }, "Failed to void invoice"); throw new InternalServerError("Failed to void invoice"); } }

  async recordPayment(id: string, input: CreatePaymentInput, actorId: string): Promise<{ invoice: InvoiceDetails; payment: Payment; paidAmount: Prisma.Decimal; status: Invoice["status"] }> {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM "Invoice" WHERE id = ${id} FOR UPDATE`;
        const current = await tx.invoice.findUnique({ where: { id } });
        if (!current) throw new NotFoundError(`Invoice with ID '${id}' not found`);
        const amount = decimal(input.amount);
        const nprAmount = current.currency === "NPR" ? amount : decimal(input.actual_npr_amount ?? 0);
        if (nprAmount.lte(0)) throw new ConflictError("A valid NPR payment amount is required");
        const remaining = decimal(current.total_amount).minus(decimal(current.paid_amount));
        if (amount.gt(remaining)) throw new ConflictError("Payment exceeds the remaining invoice balance");
        const paidAmount = decimal(current.paid_amount).plus(amount);
        const status: Invoice["status"] = paidAmount.eq(decimal(current.total_amount)) ? "paid" : "partially_paid";
        const payment = await tx.payment.create({ data: { direction: "in", amount: decimal(input.amount), currency: input.currency, payment_date: toDate(input.payment_date), account_id: input.account_id, method: input.method, allocated_to_type: "invoice", allocated_to_id: id, actual_npr_amount: input.actual_npr_amount == null ? null : decimal(input.actual_npr_amount) } });
        const period = await tx.accountingPeriod.findFirst({ where: { status: "open", period_start: { lte: toDate(input.payment_date) }, period_end: { gte: toDate(input.payment_date) } } });
        if (!period) throw new ConflictError("No open accounting period covers the payment date");
        const ar = await findAccountByCode(tx, current.currency === "NPR" ? "1200" : "1210");
        if (!ar) throw new ConflictError("Invoice payment requires the configured receivable account");
        const receivableValue = amount.mul(current.currency === "NPR" ? 1 : decimal(current.exchange_rate_to_npr ?? 0));
        const lines: { account_id: string; debit?: Prisma.Decimal; credit?: Prisma.Decimal; description?: string }[] = [{ account_id: input.account_id, debit: nprAmount, description: "Bank or cash receipt" }, { account_id: ar.id, credit: receivableValue, description: "Accounts receivable settlement" }];
        const difference = nprAmount.minus(receivableValue);
        if (!difference.isZero()) { const fx = await findAccountByCode(tx, difference.gt(0) ? "4090" : "5090"); if (!fx) throw new ConflictError("FX gain/loss account is required for this payment"); if (difference.gt(0)) lines.push({ account_id: fx.id, credit: difference, description: "Realized FX gain" }); else lines.push({ account_id: fx.id, debit: difference.abs(), description: "Realized FX loss" }); }
        const journal = await postJournalEntry(tx, { entry_date: toDate(input.payment_date), period_id: period.id, source_type: "payment", source_id: payment.id, created_by: actorId, memo: `Invoice payment ${payment.id}`, lines });
        await tx.payment.update({ where: { id: payment.id }, data: { journal_entry_id: journal.id } });
        const invoice = await tx.invoice.update({ where: { id }, data: { paid_amount: paidAmount, status }, include: { client: { select: clientSelect }, items: true } });
        return { invoice: await withPayments(tx, invoice), payment, paidAmount, status };
      }, { isolationLevel: "Serializable" });
    } catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, invoiceId: id }, "Failed to record invoice payment"); throw new InternalServerError("Failed to record invoice payment"); }
  }

  async findAging(): Promise<InvoiceDetails[]> {
    try { const rows = await prisma.invoice.findMany({ where: { status: { notIn: ["paid", "void"] } }, include: { client: { select: clientSelect }, items: true }, orderBy: { due_date: "asc" } }); return Promise.all(rows.map((row) => withPayments(prisma, row))); }
    catch (error) { logger.error({ err: error }, "Failed to fetch accounts receivable aging"); throw new InternalServerError("Failed to fetch accounts receivable aging"); }
  }

  async recordAudit(input: { user_id?: string; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown> }): Promise<void> {
    try { const data: Prisma.AuditLogCreateInput = { user_id: input.user_id ?? null, action: input.action, entity_type: "Invoice", entity_id: input.entity_id }; if (input.old_value) data.old_value = input.old_value as Prisma.InputJsonValue; if (input.new_value) data.new_value = input.new_value as Prisma.InputJsonValue; await prisma.auditLog.create({ data }); }
    catch (error) { logger.error({ err: error, invoiceId: input.entity_id, action: input.action }, "Failed to write invoice audit log"); }
  }

  async findActiveClient(id: string): Promise<{ id: string; currency: string } | null> {
    try { return await prisma.client.findFirst({ where: { id, is_active: true }, select: { id: true, currency: true } }); }
    catch (error) { logger.error({ err: error, clientId: id }, "Failed to validate invoice client"); throw new InternalServerError("Failed to validate invoice client"); }
  }

  async findActiveAccount(id: string): Promise<{ id: string } | null> {
    try { return await prisma.account.findFirst({ where: { id, is_active: true }, select: { id: true } }); }
    catch (error) { logger.error({ err: error, accountId: id }, "Failed to validate payment account"); throw new InternalServerError("Failed to validate payment account"); }
  }

  private async transition(id: string, status: Invoice["status"], message: string, rejectPaid = false): Promise<InvoiceDetails> {
    try { return await prisma.$transaction(async (tx) => { const current = await tx.invoice.findUnique({ where: { id } }); if (!current) throw new NotFoundError(`Invoice with ID '${id}' not found`); if (status === "sent" && current.status !== "draft") throw new ConflictError(message); if (status === "void" && (current.status === "paid" || current.status === "void" || (rejectPaid && current.paid_amount.gt(0)))) throw new ConflictError(current.status === "paid" ? "A fully paid invoice cannot be voided" : "An invoice with payments cannot be voided"); const invoice = await tx.invoice.update({ where: { id }, data: { status }, include: { client: { select: clientSelect }, items: true } }); return withPayments(tx, invoice); }); }
    catch (error) { if (error instanceof ConflictError || error instanceof NotFoundError) throw error; logger.error({ err: error, invoiceId: id }, "Failed to transition invoice"); throw new InternalServerError("Failed to update invoice status"); }
  }

  private mapError(error: unknown, message: string): never {
    if (error instanceof ConflictError || error instanceof NotFoundError) throw error;
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code: string }).code;
      if (code === "P2002") throw new ConflictError("Generated invoice number already exists; please retry");
      if (code === "P2025") throw new NotFoundError("The requested invoice or client was not found");
    }
    logger.error({ err: error }, message);
    throw new InternalServerError(message);
  }
}

const decimal = (value: number | Prisma.Decimal) => new Prisma.Decimal(String(value));
const toDate = (value: string) => new Date(`${value}T00:00:00.000Z`);
const withPayments = async (client: { payment: { findMany(args: { where: { allocated_to_type: string; allocated_to_id: string }; orderBy: { payment_date: "asc" } }): Promise<Payment[]> } }, invoice: Invoice & { client: InvoiceDetails["client"]; items: InvoiceItem[] }): Promise<InvoiceDetails> => ({ ...invoice, payments: await client.payment.findMany({ where: { allocated_to_type: "invoice", allocated_to_id: invoice.id }, orderBy: { payment_date: "asc" } }) });
const findAccountByCode = async (tx: Prisma.TransactionClient, code: string) => tx.account.findFirst({ where: { code, is_active: true }, select: { id: true } });

export const invoicesRepository = new InvoicesRepository();
