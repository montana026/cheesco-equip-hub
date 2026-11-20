-- ============================================================================
-- 20261106_round9_security_hardening.sql
-- Cheesco Equip Hub - Round 9 Security Hardening & Correctness
-- Safe to re-run (idempotent with IF EXISTS / IF NOT EXISTS)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1.a Column-level reads
-- Revoke broad SELECT and grant only safe, non-sensitive columns
-- (merchant_rental_rate on equipment stays private to server/service role)
-- ----------------------------------------------------------------------------
REVOKE SELECT ON public.equipment FROM anon, authenticated;
GRANT SELECT (
  id,
  merchant_id,
  slug,
  name,
  category,
  brand,
  model,
  year,
  condition,
  location_state,
  location_city,
  operating_hours,
  description,
  specs,
  listing_type,
  sale_price,
  cheesco_adjusted_rate,
  is_operator_included,
  is_delivery_available,
  verification_status,
  availability_status,
  is_featured,
  promotion_tier,
  promotion_expires_at,
  views_count,
  created_at,
  updated_at
) ON public.equipment TO anon, authenticated;

REVOKE SELECT ON public.merchant_profiles FROM anon, authenticated;
GRANT SELECT (
  id,
  business_name,
  verification_status
) ON public.merchant_profiles TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1.b Policy fixes
-- Recreate SELECT-only versions using get_my_merchant_profile_id() (SECURITY DEFINER)
-- Do NOT recreate any FOR ALL policy.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Merchants can view own equipment" ON public.equipment;
DROP POLICY IF EXISTS "Merchants can manage own equipment" ON public.equipment;
DROP POLICY IF EXISTS "Merchants can view their equipment rentals" ON public.rental_requests;

CREATE POLICY "Merchants can view own equipment" ON public.equipment
  FOR SELECT
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id());

CREATE POLICY "Merchants can view their equipment rentals" ON public.rental_requests
  FOR SELECT
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id());

-- ----------------------------------------------------------------------------
-- 1.c No public writes
-- Strip all direct mutating privileges from anon and authenticated clients
-- ----------------------------------------------------------------------------
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLES FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1.d Operators and Rental Operators RLS & permissions
-- ----------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_operators ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.operators FROM anon, authenticated;
REVOKE ALL ON TABLE public.rental_operators FROM anon, authenticated;

-- ----------------------------------------------------------------------------
-- 1.e Drop self-write policies (now inert after 1.c)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own data" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile or admins can update" ON public.users;

DROP POLICY IF EXISTS "Merchants can insert own profile" ON public.merchant_profiles;
DROP POLICY IF EXISTS "Merchants can update own profile" ON public.merchant_profiles;
DROP POLICY IF EXISTS "Merchants can update own profile, admins can update all" ON public.merchant_profiles;
DROP POLICY IF EXISTS "Users can create merchant profile for themselves" ON public.merchant_profiles;

-- ----------------------------------------------------------------------------
-- 1.f Payments dedicated columns & backfill
-- ----------------------------------------------------------------------------
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS payout_amount numeric,
  ADD COLUMN IF NOT EXISTS payout_disbursed_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_disbursed_by uuid,
  ADD COLUMN IF NOT EXISTS payout_reference text,
  ADD COLUMN IF NOT EXISTS refund_amount numeric,
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS deposit_refunded_by uuid,
  ADD COLUMN IF NOT EXISTS needs_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE UNIQUE INDEX IF NOT EXISTS payments_payout_reference_idx
  ON public.payments (payout_reference)
  WHERE payout_reference IS NOT NULL;

-- Backfill from raw_response JSONB (omitting deposit_status enum column)
UPDATE public.payments
SET
  payout_amount = COALESCE(payout_amount, NULLIF(raw_response->>'payout_amount', '')::numeric),
  payout_disbursed_at = COALESCE(
    payout_disbursed_at,
    NULLIF(raw_response->>'payout_disbursed_at', '')::timestamptz,
    CASE WHEN (raw_response->>'payout_disbursed')::boolean = true THEN updated_at ELSE NULL END
  ),
  payout_disbursed_by = COALESCE(payout_disbursed_by, NULLIF(raw_response->>'payout_disbursed_by', '')::uuid),
  refund_amount = COALESCE(refund_amount, NULLIF(raw_response->>'refund_amount', '')::numeric),
  refund_reason = COALESCE(refund_reason, NULLIF(raw_response->>'refund_reason', '')),
  deposit_refunded_by = COALESCE(deposit_refunded_by, NULLIF(raw_response->>'deposit_refunded_by', '')::uuid),
  deposit_released_at = COALESCE(deposit_released_at, NULLIF(raw_response->>'deposit_released_at', '')::timestamptz)
WHERE raw_response IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 1.g OPTIONAL: Scrub sensitive fields from existing raw_response (JSONB)
-- (Commented out by default; uncomment to execute when scrubbing historical rows)
-- In payments table, raw_response is JSONB. Uses the JSONB - text operator.
-- ----------------------------------------------------------------------------
/*
UPDATE public.payments
SET raw_response = (
  raw_response::jsonb
  - 'ip'
  - 'device'
  - 'device_fingerprint'
  - 'fingerprint'
  - 'authorization'
  - 'customer'
  - 'log'
)
WHERE raw_response IS NOT NULL;
*/

COMMIT;
