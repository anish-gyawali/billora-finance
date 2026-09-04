import type { Account, Payment, Prisma } from "../../generated/prisma/client.js";
import type { CreatePaymentInput, QueryPaymentsInput, UpdatePaymentInput } from "./payments.validation.js";

export type PaymentRecord = Payment & { account: Account };
export interface IPaymentsRepository {
  create(input: CreatePaymentInput): Promise<PaymentRecord>;
  findById(id: string): Promise<PaymentRecord | null>;
  findAll(input: QueryPaymentsInput): Promise<{ payments: PaymentRecord[]; total: number }>;
  update(id: string, input: UpdatePaymentInput): Promise<PaymentRecord>;
  findAccount(id: string): Promise<{ id: string; is_active: boolean } | null>;
  resolveAllocation(type: string, id: string | null): Promise<unknown>;
  recordAudit(input: { user_id?: string; action: string; entity_id: string; old_value?: Record<string, unknown>; new_value?: Record<string, unknown> }): Promise<void>;
}

export type PaymentTransactionResult = { payment: PaymentRecord; allocation: unknown };
export type DecimalLike = Prisma.Decimal;
