-- Complete the invoice relationships and payment fields used by the MVP module.
ALTER TABLE "InvoiceItem"
  ADD CONSTRAINT "InvoiceItem_invoice_id_fkey"
  FOREIGN KEY ("invoice_id") REFERENCES "Invoice"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD COLUMN "actual_npr_amount" DECIMAL(14,2);

CREATE INDEX "Invoice_status_idx" ON "Invoice" ("status");
CREATE INDEX "Invoice_due_date_idx" ON "Invoice" ("due_date");
CREATE INDEX "Payment_allocated_to_idx" ON "Payment" ("allocated_to_type", "allocated_to_id");
CREATE INDEX "Payment_payment_date_idx" ON "Payment" ("payment_date");
