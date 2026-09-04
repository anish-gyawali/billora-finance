CREATE INDEX "Document_owner_type_owner_id_idx" ON "Document"("owner_type", "owner_id");
CREATE INDEX "Document_uploaded_by_idx" ON "Document"("uploaded_by");
