-- Add salary-run ownership, approval, journal, and duplicate-employee integrity.
ALTER TABLE "SalaryRun"
  ADD CONSTRAINT "SalaryRun_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalaryRun"
  ADD CONSTRAINT "SalaryRun_journal_entry_id_fkey"
  FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalaryItem"
  ADD CONSTRAINT "SalaryItem_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "SalaryRun_journal_entry_id_key" ON "SalaryRun" ("journal_entry_id");
CREATE UNIQUE INDEX "SalaryItem_salary_run_id_user_id_key" ON "SalaryItem" ("salary_run_id", "user_id");
CREATE INDEX "SalaryRun_period_start_period_end_idx" ON "SalaryRun" ("period_start", "period_end");
CREATE INDEX "SalaryItem_user_id_idx" ON "SalaryItem" ("user_id");
