-- Add lifecycle fields for safe soft deletion.
ALTER TABLE "BankAccount"
  ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "deleted_at" TIMESTAMP(3);

-- A bank account is a one-to-one representation of an asset GL account.
ALTER TABLE "BankAccount"
  ADD CONSTRAINT "BankAccount_gl_account_id_fkey"
  FOREIGN KEY ("gl_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "BankAccount_currency_idx" ON "BankAccount"("currency");
CREATE INDEX "BankAccount_is_active_idx" ON "BankAccount"("is_active");
