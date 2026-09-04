ALTER TABLE "AuditLog"
  ADD COLUMN "user_name" TEXT,
  ADD COLUMN "user_role" "UserRole",
  ADD COLUMN "action_status" TEXT NOT NULL DEFAULT 'success',
  ADD COLUMN "action_reason" TEXT,
  ADD COLUMN "entity_name" TEXT,
  ADD COLUMN "related_entity_type" TEXT,
  ADD COLUMN "related_entity_id" TEXT,
  ADD COLUMN "changed_fields" JSONB,
  ADD COLUMN "ip_address" TEXT,
  ADD COLUMN "user_agent" TEXT,
  ADD COLUMN "request_id" TEXT,
  ADD COLUMN "notes" TEXT;

CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");
CREATE INDEX "AuditLog_user_id_created_at_idx" ON "AuditLog"("user_id", "created_at");
CREATE INDEX "AuditLog_entity_type_created_at_idx" ON "AuditLog"("entity_type", "created_at");
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_action_status_idx" ON "AuditLog"("action_status");
