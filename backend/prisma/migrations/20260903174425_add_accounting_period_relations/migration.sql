-- AlterTable
ALTER TABLE "AccountingPeriod" ALTER COLUMN "status" SET DEFAULT 'open';

-- CreateIndex
CREATE INDEX "JournalEntry_period_id_idx" ON "JournalEntry"("period_id");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "AccountingPeriod"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
