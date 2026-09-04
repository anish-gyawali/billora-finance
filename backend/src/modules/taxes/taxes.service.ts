import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../../common/errors/AppError.js";
import { taxesRepository, type TaxRuleRecord } from "./taxes.repository.js";
import type { ApplicableQuery, CreateTaxRuleInput, TaxRuleQuery, UpdateTaxRuleInput, VerifyTaxRuleInput } from "./taxes.validation.js";

type RuleStatus = "active" | "expired" | "pending" | "unverified" | "archived";
const status = (rule: TaxRuleRecord, now = new Date()): RuleStatus => { if (!rule.is_active) return "archived"; if (!rule.verified_by_accountant) return "unverified"; if (rule.effective_from > now) return "pending"; if (rule.effective_to && rule.effective_to < now) return "expired"; return "active"; };
const summary = (rule: TaxRuleRecord) => ({ ...rule, rate: rule.rate.toString(), status: status(rule) });

export class TaxesService {
  async create(input: CreateTaxRuleInput, actorId: string) { const created = await taxesRepository.create(input, actorId); await taxesRepository.audit({ user_id: actorId, action: "CREATE_TAX_RULE", entity_id: created.id, new_value: { tax_type: created.tax_type, rate: created.rate.toString(), effective_from: created.effective_from.toISOString() } }); return summary(created); }
  async list(query: TaxRuleQuery) { const result = await taxesRepository.findAll(query); return { items: result.items.map(summary), total: result.total }; }
  async get(id: string) { const rule = await this.require(id); return summary(rule); }
  async applicable(query: ApplicableQuery) { const rule = await taxesRepository.findApplicable(query.tax_type, query.date); if (!rule) throw new NotFoundError(`No applicable tax rule found for ${query.tax_type} on ${query.date.toISOString()}`); return { ...summary(rule), rate: rule.rate.toString() }; }
  async history(taxType: string) { const rules = await taxesRepository.history(taxType); return { tax_type: taxType, history: rules.map(summary) }; }
  async update(id: string, input: UpdateTaxRuleInput, actorId: string, isFounder: boolean) { const current = await this.require(id); if (!isFounder && current.verified_by_accountant && current.created_by_user_id !== actorId) throw new ForbiddenError("Accountants cannot edit another accountant's verified tax rule"); const effectiveTo = input.effective_to !== undefined ? input.effective_to : current.effective_to; if (effectiveTo && effectiveTo < current.effective_from) throw new BadRequestError("effective_to must be after or equal to effective_from"); const updated = await taxesRepository.update(id, input, actorId); await taxesRepository.audit({ user_id: actorId, action: "UPDATE_TAX_RULE", entity_id: id, old_value: { rate: current.rate.toString(), effective_to: current.effective_to?.toISOString() ?? null }, new_value: { rate: updated.rate.toString(), effective_to: updated.effective_to?.toISOString() ?? null } }); return summary(updated); }
  async verify(id: string, input: VerifyTaxRuleInput, actorId: string) { const current = await this.require(id); const updated = await taxesRepository.verify(id, input.verified, actorId); await taxesRepository.audit({ user_id: actorId, action: "VERIFY_TAX_RULE", entity_id: id, old_value: { verified_by_accountant: current.verified_by_accountant }, new_value: { verified_by_accountant: updated.verified_by_accountant, verification_notes: input.verification_notes ?? null } }); return summary(updated); }
  async archive(id: string, actorId: string) { const current = await this.require(id); const archived = await taxesRepository.archive(id); await taxesRepository.audit({ user_id: actorId, action: "DELETE_TAX_RULE", entity_id: id, old_value: { is_active: current.is_active }, new_value: { is_active: false } }); return { id: archived.id, message: "Tax rule archived successfully" }; }
  private async require(id: string) { const rule = await taxesRepository.findById(id); if (!rule) throw new NotFoundError(`Tax rule with ID '${id}' not found`); return rule; }
}
export const taxesService = new TaxesService();
