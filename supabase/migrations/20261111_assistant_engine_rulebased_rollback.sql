-- ============================================================================
-- Rollback Migration: 20261111_assistant_engine_rulebased_rollback.sql
-- Description: Reverses 20261111_assistant_engine_rulebased.sql
-- ============================================================================

BEGIN;

DROP POLICY IF EXISTS "Users can view events for their own requests" ON public.request_events;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
DROP POLICY IF EXISTS "Public can view published faq entries" ON public.faq_entries;

DROP TABLE IF EXISTS public.request_events CASCADE;
DROP TABLE IF EXISTS public.requests CASCADE;
DROP TABLE IF EXISTS public.assistant_sessions CASCADE;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_logs') THEN
    ALTER TABLE public.chat_logs DROP COLUMN IF EXISTS request_reference;
    ALTER TABLE public.chat_logs DROP COLUMN IF EXISTS request_id;
    ALTER TABLE public.chat_logs DROP COLUMN IF EXISTS is_unknown;
    ALTER TABLE public.chat_logs DROP COLUMN IF EXISTS matched_flow;
    ALTER TABLE public.chat_logs DROP COLUMN IF EXISTS intent;
  END IF;
END $$;

COMMIT;
