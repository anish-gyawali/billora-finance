ALTER TABLE "JournalLine" DROP CONSTRAINT IF EXISTS "JournalLine_debit_credit_check";
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_debit_credit_check"
  CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0));

CREATE OR REPLACE FUNCTION billora_validate_posted_journal_entry()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE line_count INTEGER; debit_total NUMERIC(14,2); credit_total NUMERIC(14,2);
BEGIN
  IF NEW.status = 'posted' THEN
    SELECT COUNT(*), COALESCE(SUM(debit),0), COALESCE(SUM(credit),0)
      INTO line_count, debit_total, credit_total FROM "JournalLine" WHERE journal_entry_id = NEW.id;
    IF line_count < 2 OR debit_total <> credit_total OR debit_total <= 0 THEN
      RAISE EXCEPTION 'Posted journal entry must contain balanced lines';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS billora_validate_posted_journal_entry ON "JournalEntry";
CREATE CONSTRAINT TRIGGER billora_validate_posted_journal_entry
AFTER INSERT OR UPDATE OF status ON "JournalEntry" DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION billora_validate_posted_journal_entry();

CREATE OR REPLACE FUNCTION billora_prevent_posted_journal_mutation()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'JournalEntry' AND OLD.status = 'posted' THEN
    IF TG_OP <> 'UPDATE' OR NEW.status <> 'reversed' THEN
      RAISE EXCEPTION 'Posted journal entries are immutable; create a reversal';
    END IF;
  ELSIF TG_TABLE_NAME = 'JournalLine' AND EXISTS
    (SELECT 1 FROM "JournalEntry" WHERE id = OLD.journal_entry_id AND status = 'posted') THEN
    RAISE EXCEPTION 'Lines of posted journal entries are immutable';
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;
DROP TRIGGER IF EXISTS billora_prevent_posted_entry_mutation ON "JournalEntry";
CREATE TRIGGER billora_prevent_posted_entry_mutation BEFORE UPDATE OR DELETE ON "JournalEntry"
FOR EACH ROW EXECUTE FUNCTION billora_prevent_posted_journal_mutation();
DROP TRIGGER IF EXISTS billora_prevent_posted_line_mutation ON "JournalLine";
CREATE TRIGGER billora_prevent_posted_line_mutation BEFORE UPDATE OR DELETE ON "JournalLine"
FOR EACH ROW EXECUTE FUNCTION billora_prevent_posted_journal_mutation();
