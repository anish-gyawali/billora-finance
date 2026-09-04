-- AlterTable
ALTER TABLE "Account" ALTER COLUMN "is_active" SET DEFAULT true;

-- CreateIndex
CREATE INDEX "Account_parent_id_idx" ON "Account"("parent_id");

-- CreateIndex
CREATE INDEX "JournalLine_account_id_idx" ON "JournalLine"("account_id");

-- CreateIndex
CREATE INDEX "JournalLine_journal_entry_id_idx" ON "JournalLine"("journal_entry_id");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
