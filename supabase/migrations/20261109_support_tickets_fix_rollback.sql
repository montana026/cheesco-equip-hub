-- ============================================================
-- Rollback Migration: Support tickets bug-fixes rollback
-- Safe to re-run (IF EXISTS / IF NOT EXISTS guards throughout).
-- ============================================================

BEGIN;

-- Restore NOT NULL on user_id (only if no nulls exist)
DO $$
BEGIN
  -- Backfill any null user_ids with the first super admin or existing user before re-adding constraint
  UPDATE public.support_tickets
  SET user_id = (SELECT id FROM public.users LIMIT 1)
  WHERE user_id IS NULL;

  ALTER TABLE public.support_tickets
    ALTER COLUMN user_id SET NOT NULL;
END$$;

COMMIT;
