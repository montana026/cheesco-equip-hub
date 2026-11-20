-- ============================================================================
-- Rollback Migration: 20261109_equipment_assistant_rollback.sql
-- Description: Reverses the 20261109_equipment_assistant.sql migration:
--   - Drops policies on faq_entries and chat_logs
--   - Drops faq_entries and chat_logs tables
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Public can view published faq entries" ON public.faq_entries;

DROP TABLE IF EXISTS public.chat_logs CASCADE;
DROP TABLE IF EXISTS public.faq_entries CASCADE;

COMMIT;
