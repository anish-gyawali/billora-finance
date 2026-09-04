-- Add lifecycle fields before introducing client relationships and constraints.
ALTER TABLE "Client"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- Existing deployments must be checked for duplicates before this migration.
-- Email uniqueness is case-insensitive because the API normalizes email addresses.
CREATE UNIQUE INDEX "Client_billing_email_lower_key"
  ON "Client" (LOWER("billing_email"));

CREATE UNIQUE INDEX "Client_pan_number_key"
  ON "Client" ("pan_number")
  WHERE "pan_number" IS NOT NULL;

CREATE INDEX "Client_country_idx" ON "Client" ("country");
CREATE INDEX "Client_currency_idx" ON "Client" ("currency");
CREATE INDEX "Client_is_active_idx" ON "Client" ("is_active");

CREATE INDEX "Invoice_client_id_idx" ON "Invoice" ("client_id");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_client_id_fkey"
  FOREIGN KEY ("client_id") REFERENCES "Client"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
