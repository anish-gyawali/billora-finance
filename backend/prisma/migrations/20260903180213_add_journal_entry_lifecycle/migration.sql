/*
  Warnings:

  - The `source_id` column on the `JournalEntry` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "AccountingPeriod" ALTER COLUMN "period_start" SET DATA TYPE DATE,
ALTER COLUMN "period_end" SET DATA TYPE DATE;

-- AlterTable
ALTER TABLE "JournalEntry" ALTER COLUMN "updated_at" DROP DEFAULT,
ALTER COLUMN "entry_date" SET DATA TYPE DATE,
ALTER COLUMN "status" SET DEFAULT 'draft',
DROP COLUMN "source_id",
ADD COLUMN     "source_id" UUID;

-- CreateIndex
CREATE INDEX "JournalEntry_created_by_idx" ON "JournalEntry"("created_by");

-- CreateIndex
CREATE INDEX "JournalEntry_reversed_entry_id_idx" ON "JournalEntry"("reversed_entry_id");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_reversed_entry_id_fkey" FOREIGN KEY ("reversed_entry_id") REFERENCES "JournalEntry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "JournalLine"
ADD CONSTRAINT "JournalLine_debit_credit_check"
CHECK (
  (debit > 0 AND credit = 0)
  OR
  (credit > 0 AND debit = 0)
);