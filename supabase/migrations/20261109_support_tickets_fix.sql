-- ============================================================
-- Migration: Support tickets bug-fixes
-- 1. Make user_id nullable (anonymous / guest submissions)
-- 2. Add "GENERAL_INQUIRY" to ticket_category so legacy data
--    created before this migration is not broken (optional label
--    kept for safety; the app now maps to 'OTHER' going forward).
-- Safe to re-run (IF EXISTS / IF NOT EXISTS guards throughout).
-- ============================================================

BEGIN;

-- 1. Make user_id nullable so anonymous support form submissions work.
--    Previously NOT NULL, which caused every submission from a visitor
--    without a registered account to crash with a DB constraint error.
ALTER TABLE public.support_tickets
  ALTER COLUMN user_id DROP NOT NULL;

-- 2. Add GENERAL_INQUIRY to the ticket_category enum so any rows
--    already inserted with that value (before this migration) remain valid.
--    New submissions from the app will use 'OTHER' instead.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'GENERAL_INQUIRY'
      AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'ticket_category')
  ) THEN
    ALTER TYPE ticket_category ADD VALUE IF NOT EXISTS 'GENERAL_INQUIRY';
  END IF;
END$$;

COMMIT;
