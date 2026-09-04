-- Add database integrity for payment accounts and salary-run allocation targets.
ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalaryItem"
  ADD CONSTRAINT "SalaryItem_salary_run_id_fkey"
  FOREIGN KEY ("salary_run_id") REFERENCES "SalaryRun"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Payment_account_id_idx" ON "Payment" ("account_id");
