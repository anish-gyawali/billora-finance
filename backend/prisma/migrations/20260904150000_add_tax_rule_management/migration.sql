ALTER TABLE "TaxRule"
  ADD COLUMN "verified_by_user_id" TEXT,
  ADD COLUMN "verified_at" TIMESTAMP(3),
  ADD COLUMN "created_by_user_id" TEXT,
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "TaxRule_tax_type_effective_from_key"
  ON "TaxRule"("tax_type", "effective_from");
CREATE INDEX "TaxRule_tax_type_idx" ON "TaxRule"("tax_type");
CREATE INDEX "TaxRule_effective_from_idx" ON "TaxRule"("effective_from");
CREATE INDEX "TaxRule_effective_to_idx" ON "TaxRule"("effective_to");
CREATE INDEX "TaxRule_is_active_idx" ON "TaxRule"("is_active");

ALTER TABLE "TaxRule"
  ADD CONSTRAINT "TaxRule_verified_by_user_id_fkey"
  FOREIGN KEY ("verified_by_user_id") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "TaxRule"
  ADD CONSTRAINT "TaxRule_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
