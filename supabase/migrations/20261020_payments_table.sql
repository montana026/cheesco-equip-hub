-- ============================================================================
-- CHEESCO EQUIP HUB - PAYMENTS TABLE & REALTIME RLS MIGRATION
-- Run this in your Supabase Project -> SQL Editor
-- ============================================================================

-- Ensure uuid-ossp or pgcrypto extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create payments table if it does not exist
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('paystack', 'flutterwave', 'bank_transfer')),
  reference TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'awaiting_confirmation', 'paid', 'failed')),
  raw_response JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. If table was pre-existing from an earlier schema, add missing columns safely
DO $$
BEGIN
  -- quotation_id
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'quotation_id') THEN
    ALTER TABLE public.payments ADD COLUMN quotation_id UUID REFERENCES public.quotations(id) ON DELETE CASCADE;
  END IF;

  -- provider
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'provider') THEN
    ALTER TABLE public.payments ADD COLUMN provider TEXT;
  END IF;

  -- reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'reference') THEN
    ALTER TABLE public.payments ADD COLUMN reference TEXT;
  END IF;

  -- status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'status') THEN
    ALTER TABLE public.payments ADD COLUMN status TEXT DEFAULT 'pending';
  END IF;

  -- raw_response
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'raw_response') THEN
    ALTER TABLE public.payments ADD COLUMN raw_response JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Ensure unique index on reference
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_unique_reference ON public.payments(reference) WHERE reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_quotation_id ON public.payments(quotation_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

-- 3. Row Level Security (RLS)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Drop prior policies to avoid conflicts
DROP POLICY IF EXISTS "Customers can only read their own payments" ON public.payments;
DROP POLICY IF EXISTS "Users can view own payments" ON public.payments;
DROP POLICY IF EXISTS "Admins have full view of payments" ON public.payments;

-- Policy: Customers can only read their own payments; Admins can read all payments
CREATE POLICY "Customers can only read their own payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotations q
      JOIN public.rental_requests rr ON rr.id = q.rental_request_id
      WHERE q.id = payments.quotation_id
      AND rr.customer_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid() AND u.role IN ('OPERATIONS_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN')
    )
  );

-- Only Edge Functions (service role) can insert or update them.
-- In Supabase, service_role bypasses RLS automatically.
-- By having NO INSERT or UPDATE policies for public or authenticated roles,
-- direct client writes are blocked, and only service_role (Edge Functions / API backend) can mutate payments.

-- 4. Enable Supabase Realtime for payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'payments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Publication might already have table or user may not have superuser in certain hosted tiers
END $$;




