-- ============================================================================
-- CHEESCO EQUIP HUB - COMPREHENSIVE ROW LEVEL SECURITY (RLS) MIGRATION
-- Verified against live PostgreSQL schema.
-- Apply this migration in the Supabase Dashboard SQL Editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: HELPER FUNCTIONS (SECURITY DEFINER)
-- ----------------------------------------------------------------------------

-- Check if current authenticated user has an active admin role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('OPERATIONS_ADMIN', 'VERIFICATION_ADMIN', 'FINANCE_ADMIN', 'SUPPORT_ADMIN', 'SUPER_ADMIN')
  );
$$;

-- Get current authenticated user's merchant profile ID (if merchant)
CREATE OR REPLACE FUNCTION public.get_my_merchant_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.merchant_profiles
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- STEP 2: USERS TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own profile or admins can read all" ON public.users;
CREATE POLICY "Users can read own profile or admins can read all" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile or admins can update" ON public.users;
CREATE POLICY "Users can update own profile or admins can update" ON public.users
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin())
  WITH CHECK (id = auth.uid() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 3: MERCHANT PROFILES TABLE
-- ----------------------------------------------------------------------------
ALTER TABLE public.merchant_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view verified merchants, merchant views own, admins view all" ON public.merchant_profiles;
CREATE POLICY "Public can view verified merchants, merchant views own, admins view all" ON public.merchant_profiles
  FOR SELECT
  TO public
  USING (
    verification_status = 'VERIFIED'
    OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
    OR public.is_admin()
  );

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
-- STEP 4: EQUIPMENT CATALOG & ASSETS
-- ----------------------------------------------------------------------------
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view verified equipment, merchant views own, admins view all" ON public.equipment;
CREATE POLICY "Public can view verified equipment, merchant views own, admins view all" ON public.equipment
  FOR SELECT
  TO public
  USING (
    verification_status = 'VERIFIED'
    OR (auth.uid() IS NOT NULL AND merchant_id = public.get_my_merchant_profile_id())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Merchants can insert own equipment, admins can insert" ON public.equipment;
CREATE POLICY "Merchants can insert own equipment, admins can insert" ON public.equipment
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can update own equipment, admins can update" ON public.equipment;
CREATE POLICY "Merchants can update own equipment, admins can update" ON public.equipment
  FOR UPDATE
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
  WITH CHECK (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

-- Equipment Images
ALTER TABLE public.equipment_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view equipment images" ON public.equipment_images;
CREATE POLICY "Public can view equipment images" ON public.equipment_images
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Merchants can manage own equipment images" ON public.equipment_images;
CREATE POLICY "Merchants can manage own equipment images" ON public.equipment_images
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_images.equipment_id
        AND (e.merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
    )
  );

-- Equipment Availability
ALTER TABLE public.equipment_availability ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view equipment availability" ON public.equipment_availability;
CREATE POLICY "Public can view equipment availability" ON public.equipment_availability
  FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Merchants can manage own equipment availability" ON public.equipment_availability;
CREATE POLICY "Merchants can manage own equipment availability" ON public.equipment_availability
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_availability.equipment_id
        AND (e.merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
    )
  );

-- Equipment Documents
ALTER TABLE public.equipment_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners and admins can view equipment documents" ON public.equipment_documents;
CREATE POLICY "Owners and admins can view equipment documents" ON public.equipment_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_documents.equipment_id
        AND (e.merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
    )
  );

DROP POLICY IF EXISTS "Owners and admins can manage equipment documents" ON public.equipment_documents;
CREATE POLICY "Owners and admins can manage equipment documents" ON public.equipment_documents
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.equipment e
      WHERE e.id = equipment_documents.equipment_id
        AND (e.merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
    )
  );

-- Merchant Documents
ALTER TABLE public.merchant_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants and admins view merchant documents" ON public.merchant_documents;
CREATE POLICY "Merchants and admins view merchant documents" ON public.merchant_documents
  FOR SELECT
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants and admins manage merchant documents" ON public.merchant_documents;
CREATE POLICY "Merchants and admins manage merchant documents" ON public.merchant_documents
  FOR ALL
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 5: RENTAL REQUESTS & QUOTATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own requests, merchants view requested units, admins view all" ON public.rental_requests;
CREATE POLICY "Customers view own requests, merchants view requested units, admins view all" ON public.rental_requests
  FOR SELECT
  TO authenticated
  USING (
    customer_id = auth.uid()
    OR merchant_id = public.get_my_merchant_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can create rental requests" ON public.rental_requests;
CREATE POLICY "Customers can create rental requests" ON public.rental_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can cancel pending, admins can update all" ON public.rental_requests;
CREATE POLICY "Customers can cancel pending, admins can update all" ON public.rental_requests
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

-- Quotations
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customer views own quotation, admins view all" ON public.quotations;
CREATE POLICY "Customer views own quotation, admins view all" ON public.quotations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = quotations.rental_request_id
        AND (rr.customer_id = auth.uid() OR rr.merchant_id = public.get_my_merchant_profile_id())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Only admins can insert or update quotations" ON public.quotations;
CREATE POLICY "Only admins can insert or update quotations" ON public.quotations
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 6: NOTIFICATIONS (ISOLATED TO RECIPIENT)
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only select their own notifications" ON public.notifications;
CREATE POLICY "Users can only select their own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark their own notifications as read" ON public.notifications;
CREATE POLICY "Users can mark their own notifications as read" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- STEP 7: SUPPORT TICKETS (FIXED: user_id column)
-- ----------------------------------------------------------------------------
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Customers view own tickets, admins view all" ON public.support_tickets;
CREATE POLICY "Customers view own tickets, admins view all" ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create tickets" ON public.support_tickets;
CREATE POLICY "Customers can create tickets" ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets" ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 8: AD CAMPAIGNS (MERCHANT CONFIDENTIAL)
-- ----------------------------------------------------------------------------
ALTER TABLE public.ad_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Merchants view own ad campaigns, admins view all" ON public.ad_campaigns;
CREATE POLICY "Merchants view own ad campaigns, admins view all" ON public.ad_campaigns
  FOR SELECT
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can create own ad campaigns" ON public.ad_campaigns;
CREATE POLICY "Merchants can create own ad campaigns" ON public.ad_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Merchants can update own campaigns, admins can update all" ON public.ad_campaigns;
CREATE POLICY "Merchants can update own campaigns, admins can update all" ON public.ad_campaigns
  FOR UPDATE
  TO authenticated
  USING (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
  WITH CHECK (merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 9: REVIEWS & RATINGS (FIXED: reviewer_id and is_verified columns)
-- ----------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Approved reviews are public, authors and admins see all" ON public.reviews;
DROP POLICY IF EXISTS "Public can view reviews, reviewers view own, admins view all" ON public.reviews;
CREATE POLICY "Public can view reviews, reviewers view own, admins view all" ON public.reviews
  FOR SELECT
  TO public
  USING (
    is_verified = true
    OR (auth.uid() IS NOT NULL AND reviewer_id = auth.uid())
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can write reviews" ON public.reviews;
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (reviewer_id = auth.uid() OR public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 10: RENTAL STATE HISTORY, LOGISTICS & INSPECTIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.rental_state_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized participants view rental history" ON public.rental_state_history;
CREATE POLICY "Authorized participants view rental history" ON public.rental_state_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = rental_state_history.rental_request_id
        AND (
          rr.customer_id = auth.uid()
          OR rr.merchant_id = public.get_my_merchant_profile_id()
        )
    )
    OR public.is_admin()
  );

-- Logistics
ALTER TABLE public.logistics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized participants view logistics" ON public.logistics;
CREATE POLICY "Authorized participants view logistics" ON public.logistics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = logistics.rental_request_id
        AND (
          rr.customer_id = auth.uid()
          OR rr.merchant_id = public.get_my_merchant_profile_id()
        )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Only admins can mutate logistics" ON public.logistics;
CREATE POLICY "Only admins can mutate logistics" ON public.logistics
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Inspections
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized participants view inspections" ON public.inspections;
CREATE POLICY "Authorized participants view inspections" ON public.inspections
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = inspections.rental_request_id
        AND (
          rr.customer_id = auth.uid()
          OR rr.merchant_id = public.get_my_merchant_profile_id()
        )
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Only admins can mutate inspections" ON public.inspections;
CREATE POLICY "Only admins can mutate inspections" ON public.inspections
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- STEP 11: PAYMENTS & RENTAL AGREEMENTS
-- ----------------------------------------------------------------------------
-- Payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authorized participants view payments" ON public.payments;
CREATE POLICY "Authorized participants view payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING (
    payer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = payments.rental_request_id
        AND (rr.customer_id = auth.uid() OR rr.merchant_id = public.get_my_merchant_profile_id())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Payers can initiate payment records" ON public.payments;
CREATE POLICY "Payers can initiate payment records" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (payer_id = auth.uid() OR public.is_admin());

-- Rental Agreements
ALTER TABLE public.rental_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Rental participants view agreements" ON public.rental_agreements;
CREATE POLICY "Rental participants view agreements" ON public.rental_agreements
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = rental_agreements.rental_request_id
        AND (rr.customer_id = auth.uid() OR rr.merchant_id = public.get_my_merchant_profile_id())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Customers can sign rental agreements" ON public.rental_agreements;
CREATE POLICY "Customers can sign rental agreements" ON public.rental_agreements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = rental_agreements.rental_request_id
        AND rr.customer_id = auth.uid()
    )
    OR public.is_admin()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rental_requests rr
      WHERE rr.id = rental_agreements.rental_request_id
        AND rr.customer_id = auth.uid()
    )
    OR public.is_admin()
  );

-- ----------------------------------------------------------------------------
-- STEP 12: MESSAGES, SALES ENQUIRIES, SAVED EQUIPMENT & DISPUTES
-- ----------------------------------------------------------------------------
-- Messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Participants view own messages" ON public.messages;
CREATE POLICY "Participants view own messages" ON public.messages
  FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Recipients can update message read status" ON public.messages;
CREATE POLICY "Recipients can update message read status" ON public.messages
  FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid() OR public.is_admin())
  WITH CHECK (recipient_id = auth.uid() OR public.is_admin());

-- Saved Equipment
ALTER TABLE public.saved_equipment ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view and manage own saved equipment" ON public.saved_equipment;
CREATE POLICY "Users view and manage own saved equipment" ON public.saved_equipment
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Sales Enquiries
ALTER TABLE public.sales_enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties view own sales enquiries" ON public.sales_enquiries;
CREATE POLICY "Parties view own sales enquiries" ON public.sales_enquiries
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Customers can create sales enquiries" ON public.sales_enquiries;
CREATE POLICY "Customers can create sales enquiries" ON public.sales_enquiries
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Parties can update sales enquiries" ON public.sales_enquiries;
CREATE POLICY "Parties can update sales enquiries" ON public.sales_enquiries
  FOR UPDATE
  TO authenticated
  USING (customer_id = auth.uid() OR merchant_id = public.get_my_merchant_profile_id() OR public.is_admin())
  WITH CHECK (customer_id = auth.uid() OR merchant_id = public.get_my_merchant_profile_id() OR public.is_admin());

-- Disputes
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Parties view own disputes, admins view all" ON public.disputes;
CREATE POLICY "Parties view own disputes, admins view all" ON public.disputes
  FOR SELECT
  TO authenticated
  USING (raised_by = auth.uid() OR raised_against = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Users can raise disputes" ON public.disputes;
CREATE POLICY "Users can raise disputes" ON public.disputes
  FOR INSERT
  TO authenticated
  WITH CHECK (raised_by = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "Admins can update disputes" ON public.disputes;
CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Audit Logs (Admins only)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- ============================================================================
-- END OF COMPREHENSIVE RLS MIGRATION
-- ============================================================================
