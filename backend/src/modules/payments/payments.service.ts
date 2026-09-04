import { Prisma } from "../../generated/prisma/client.js";
import { BadRequestError, NotFoundError } from "../../common/errors/AppError.js";
import { paymentsRepository } from "./payments.repository.js";
import type { IPaymentsRepository, PaymentRecord } from "./payments.repository.interface.js";
import type { CreatePaymentInput, QueryPaymentsInput, UpdatePaymentInput } from "./payments.validation.js";

export class PaymentsService {
  constructor(private readonly repository: IPaymentsRepository = paymentsRepository) {}

  async create(input: CreatePaymentInput, actorId: string): Promise<PaymentResponse> { const payment = await this.repository.create(input, actorId); const allocation = await this.repository.resolveAllocation(input.allocated_to_type, input.allocated_to_id ?? null); if (input.allocated_to_type !== "direct" && !allocation) throw new BadRequestError("Allocation target was not found"); await this.audit(actorId, "PAYMENT_CREATED", payment.id, { direction: payment.direction, amount: payment.amount.toString(), allocated_to_type: payment.allocated_to_type, allocated_to_id: payment.allocated_to_id }); return { payment, allocation }; }
  list(input: QueryPaymentsInput) { return this.repository.findAll(input); }
  async get(id: string): Promise<PaymentResponse> { const payment = await this.repository.findById(id); if (!payment) throw new NotFoundError(`Payment with ID '${id}' not found`); return { payment, allocation: await this.repository.resolveAllocation(payment.allocated_to_type, payment.allocated_to_id) }; }
  async update(id: string, input: UpdatePaymentInput, actorId: string): Promise<PaymentResponse> { const payment = await this.repository.update(id, input, actorId); const allocation = await this.repository.resolveAllocation(payment.allocated_to_type, payment.allocated_to_id); if (payment.allocated_to_type !== "direct" && !allocation) throw new BadRequestError("Allocation target was not found"); await this.audit(actorId, "PAYMENT_UPDATED", payment.id, undefined, { amount: payment.amount.toString(), allocated_to_type: payment.allocated_to_type, allocated_to_id: payment.allocated_to_id }); return { payment, allocation }; }

  private async audit(userId: string, action: string, id: string, old_value?: Record<string, unknown>, new_value?: Record<string, unknown>) { await this.repository.recordAudit({ user_id: userId, action, entity_id: id, ...(old_value ? { old_value } : {}), ...(new_value ? { new_value } : {}) }); }
}

export interface PaymentResponse { payment: PaymentRecord; allocation: unknown; }
export const paymentsService = new PaymentsService();
