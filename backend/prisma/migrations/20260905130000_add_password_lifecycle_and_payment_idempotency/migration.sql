ALTER TABLE "User"
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Payment"
ADD COLUMN "idempotency_key" TEXT;

CREATE UNIQUE INDEX "Payment_idempotency_key_key"
ON "Payment"("idempotency_key");
