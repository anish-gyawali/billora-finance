import { ForbiddenError } from "../../common/errors/AppError.js";
import { auditRepository, type AuditRecord } from "./audit.repository.js";
import type { AuditExportQuery, AuditQuery, AuditSummaryQuery } from "./audit.validation.js";

const sensitive = /password|token|secret|authorization|account_number|bank_account_number/i;
const safe = (value: unknown): unknown => { if (Array.isArray(value)) return value.map(safe); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, sensitive.test(k) ? "[REDACTED]" : safe(v)])); return value; };
const present = (r: AuditRecord) => ({ ...r, old_value: safe(r.old_value), new_value: safe(r.new_value), changed_fields: safe(r.changed_fields) });
type Scope = { userId: string; founder: boolean };

export class AuditService {
  async list(q: AuditQuery, scope: Scope) { const result = await auditRepository.list(q, scope); return { items: result.items.map(present), total: result.total }; }
  async entity(type: string, id: string, scope: Scope) { return (await auditRepository.entity(type, id, scope)).map(present); }
  async userActivity(userId: string, scope: Scope) { if (!scope.founder && userId !== scope.userId) throw new ForbiddenError("You may only view your own audit activity"); return (await auditRepository.userActivity(userId, scope)).map(present); }
  async summary(q: AuditSummaryQuery, scope: Scope) { return auditRepository.summary(q, scope); }
  async errors(q: AuditQuery, scope: Scope) { if (!scope.founder) throw new ForbiddenError("Only the founder may view failed audit actions"); return this.list({ ...q, action_status: "failed" }, scope); }
  async export(q: AuditExportQuery, scope: Scope) { if (!scope.founder) throw new ForbiddenError("Only the founder may export audit logs"); const rows = (await auditRepository.export(q, scope)).map(present); if (q.format === "json") return { rows }; const columns = ["id", "created_at", "user_id", "action", "action_status", "entity_type", "entity_id", "request_id", "ip_address"]; const quote = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`; return { csv: [columns.join(","), ...rows.map((r) => columns.map((c) => quote((r as Record<string, unknown>)[c])).join(","))].join("\n") }; }
}
export const auditService = new AuditService();
