-- Add the foreign keys and indexes required by the Vendor and Expense modules.
ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_vendor_id_fkey"
  FOREIGN KEY ("vendor_id") REFERENCES "Vendor"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_paid_by_user_id_fkey"
  FOREIGN KEY ("paid_by_user_id") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_payment_account_id_fkey"
  FOREIGN KEY ("payment_account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_approved_by_fkey"
  FOREIGN KEY ("approved_by") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense"
  ADD CONSTRAINT "Expense_journal_entry_id_fkey"
  FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ExpenseItem"
  ADD CONSTRAINT "ExpenseItem_expense_id_fkey"
  FOREIGN KEY ("expense_id") REFERENCES "Expense"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ExpenseItem"
  ADD CONSTRAINT "ExpenseItem_account_id_fkey"
  FOREIGN KEY ("account_id") REFERENCES "Account"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Expense_vendor_id_idx" ON "Expense" ("vendor_id");
CREATE INDEX "Expense_paid_by_user_id_idx" ON "Expense" ("paid_by_user_id");
CREATE INDEX "Expense_payment_account_id_idx" ON "Expense" ("payment_account_id");
CREATE INDEX "Expense_approved_by_idx" ON "Expense" ("approved_by");
CREATE INDEX "Expense_status_idx" ON "Expense" ("status");
CREATE INDEX "ExpenseItem_expense_id_idx" ON "ExpenseItem" ("expense_id");
CREATE INDEX "ExpenseItem_account_id_idx" ON "ExpenseItem" ("account_id");
