-- ============================================================================
-- 20261106_round9_security_hardening_rollback.sql
-- Cheesco Equip Hub - Rollback for Round 9 Security Hardening
-- Safe to re-run (idempotent with IF EXISTS / IF NOT EXISTS)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- Rollback 1.f: Drop payments dedicated columns and index
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS public.payments_payout_reference_idx;

ALTER TABLE public.payments
  DROP COLUMN IF EXISTS payout_amount,
  DROP COLUMN IF EXISTS payout_disbursed_at,
  DROP COLUMN IF EXISTS payout_disbursed_by,
  DROP COLUMN IF EXISTS payout_reference,
  DROP COLUMN IF EXISTS refund_amount,
  DROP COLUMN IF EXISTS refund_reason,
  DROP COLUMN IF EXISTS deposit_refunded_by,
  DROP COLUMN IF EXISTS needs_review,
  DROP COLUMN IF EXISTS review_note;

-- ----------------------------------------------------------------------------
-- Rollback 1.e: Recreate self-write policies dropped on users & merchant_profiles
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile or admins can update" ON public.users;
CREATE POLICY "Users can update own profile or admins can update" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can insert own profile" ON public.merchant_profiles;
CREATE POLICY "Merchants can insert own profile" ON public.merchant_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Merchants can update own profile" ON public.merchant_profiles;
CREATE POLICY "Merchants can update own profile" ON public.merchant_profiles
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Merchants can update own profile, admins can update all" ON public.merchant_profiles;
CREATE POLICY "Merchants can update own profile, admins can update all" ON public.merchant_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can create merchant profile for themselves" ON public.merchant_profiles;
CREATE POLICY "Users can create merchant profile for themselves" ON public.merchant_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- Rollback 1.d: Operators and Rental Operators permissions
-- ----------------------------------------------------------------------------
GRANT ALL ON TABLE public.operators TO anon, authenticated;
GRANT ALL ON TABLE public.rental_operators TO anon, authenticated;
ALTER TABLE IF EXISTS public.operators DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.rental_operators DISABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Rollback 1.c: Grant table writes back to authenticated
-- ----------------------------------------------------------------------------
GRANT INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT INSERT, UPDATE, DELETE ON TABLES TO authenticated;

-- ----------------------------------------------------------------------------
-- Rollback 1.b: Drop SELECT-only policies and restore original policies
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Merchants can view own equipment" ON public.equipment;
CREATE POLICY "Merchants can view own equipment" ON public.equipment
  FOR SELECT
  TO authenticated
  USING (
    merchant_id = public.get_my_merchant_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can manage own equipment" ON public.equipment;
CREATE POLICY "Merchants can manage own equipment" ON public.equipment
  FOR ALL
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
  WITH CHECK (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can view their equipment rentals" ON public.rental_requests;
CREATE POLICY "Merchants can view their equipment rentals" ON public.rental_requests
  FOR SELECT
  TO authenticated
  USING (
    merchant_id = public.get_my_merchant_profile_id()
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- Rollback 1.a: Re-grant full SELECT on equipment and merchant_profiles to anon & authenticated
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.equipment TO anon, authenticated;
GRANT SELECT ON public.merchant_profiles TO anon, authenticated;

COMMIT;
