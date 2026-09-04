import type { Invoice, InvoiceItem, Payment, Prisma } from "../../generated/prisma/client.js";
import type { CreateInvoiceInput, CreatePaymentInput, QueryInvoicesInput, UpdateInvoiceInput } from "./invoices.validation.js";

export type InvoiceDetails = Invoice & {
  client: { id: string; name: string; country: string; billing_email: string; currency: string };
  items: InvoiceItem[];
  payments: Payment[];
};

export interface IInvoicesRepository {
  create(input: CreateInvoiceInput, total: Prisma.Decimal): Promise<InvoiceDetails>;
  findById(id: string): Promise<InvoiceDetails | null>;
  findAll(input: QueryInvoicesInput): Promise<{ invoices: InvoiceDetails[]; total: number }>;
  updateDraft(id: string, input: UpdateInvoiceInput, total: Prisma.Decimal): Promise<InvoiceDetails>;
  send(id: string, actorId: string): Promise<InvoiceDetails>;
  void(id: string): Promise<InvoiceDetails>;
  recordPayment(id: string, input: CreatePaymentInput): Promise<{ invoice: InvoiceDetails; payment: Payment; paidAmount: Prisma.Decimal; status: Invoice["status"] }>;
  findAging(): Promise<InvoiceDetails[]>;
  recordAudit(input: { user_id?: string | undefined; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown> }): Promise<void>;
  findActiveClient(id: string): Promise<{ id: string; currency: string } | null>;
  findActiveAccount(id: string): Promise<{ id: string } | null>;
}
