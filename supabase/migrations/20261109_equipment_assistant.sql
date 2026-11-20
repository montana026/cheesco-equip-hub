-- ============================================================================
-- Migration: 20261109_equipment_assistant.sql
-- Description: Phase 1 Cheesco Equipment Assistant schema additions:
--   1. faq_entries table with RLS (public read for published entries)
--   2. chat_logs table with RLS (service-role only; private audit/monitoring)
--   3. Seed 10 FAQ entries covering Cheesco platform model, verification,
--      rental/purchase workflows, delivery, operators, inspection, sourcing, and contact.
-- Notes:
--   - Safe to re-run (IF NOT EXISTS / IF EXISTS guards throughout)
--   - Cheesco is a platform connecting customers with equipment owners/partners.
--   - No mention of escrow.
-- ============================================================================

BEGIN;

-- 1. Create faq_entries table
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_faq_entries_topic ON public.faq_entries(topic);
CREATE INDEX IF NOT EXISTS idx_faq_entries_published ON public.faq_entries(published);

-- 2. Create chat_logs table for assistant monitoring and auditing
CREATE TABLE IF NOT EXISTS public.chat_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT,
  tool_calls JSONB,
  error TEXT,
  response_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for session lookups and monitoring dashboards
CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON public.chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON public.chat_logs(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;

-- faq_entries: public (anon and authenticated) can only read published entries
DROP POLICY IF EXISTS "Public can view published faq entries" ON public.faq_entries;
CREATE POLICY "Public can view published faq entries"
  ON public.faq_entries
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

-- Revoke write privileges on faq_entries from public
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.faq_entries FROM anon, authenticated;
GRANT SELECT ON public.faq_entries TO anon, authenticated;

-- chat_logs: completely private to service_role; no public reads or writes
REVOKE ALL ON public.chat_logs FROM anon, authenticated;

-- 4. Seed 10 Phase 1 FAQ Entries
INSERT INTO public.faq_entries (topic, question, answer, published) VALUES
(
  'how_cheesco_works',
  'What is Cheesco Equip Hub and how does it work?',
  'DRAFT - needs Cheesco approval: Cheesco Equip Hub is an intermediary platform connecting project contractors, construction firms, and industrial clients with vetted equipment owners and verified fleet partners across Nigeria. Cheesco facilitates equipment discovery, quotes, verification, and mobilization without owning the machinery directly.',
  true
),
(
  'merchant_verification',
  'How are equipment owners and listings verified?',
  'DRAFT - needs Cheesco approval: Every equipment merchant on Cheesco undergoes a comprehensive verification process, including Corporate Affairs Commission (CAC) business validation, identity checks, and equipment asset proof. Equipment listings are reviewed by Cheesco operations before being marked with the Cheesco Verified badge.',
  true
),
(
  'rental_process',
  'How do I rent equipment on Cheesco?',
  'DRAFT - needs Cheesco approval: Renting follows a clear 6-step managed workflow: 1. Find machinery matching your project requirements. 2. Request a booking with location and duration. 3. Cheesco operations reviews equipment and merchant availability. 4. Cheesco generates an itemized commercial quotation. 5. You review terms and confirm payment. 6. Logistics mobilization and delivery to your site with pre-delivery inspection.',
  true
),
(
  'purchase_process',
  'How do I buy heavy machinery on Cheesco?',
  'DRAFT - needs Cheesco approval: To purchase equipment: 1. Explore available for-sale listings. 2. Submit a purchase enquiry on the listing detail page. 3. Cheesco coordinates physical asset inspection and documentation verification. 4. A formal sales agreement is executed. 5. Payment is completed and title transfer/handover is finalized.',
  true
),
(
  'delivery_mobilization',
  'Who handles equipment delivery and transport?',
  'DRAFT - needs Cheesco approval: Delivery is coordinated through Cheesco logistics partners using dedicated lowbed and flatbed carriers across Nigeria. Mobilization and demobilization fees depend on project location, distance, and transport permits, which are clearly itemized in your commercial quotation.',
  true
),
(
  'operators',
  'Are operators included with equipment rentals?',
  'DRAFT - needs Cheesco approval: Many listings indicate whether a certified operator is included or available as an option. You can see this directly on each equipment card and detail page (Operator Included badge). If an operator is not included, Cheesco can assist in arranging a certified operator upon request.',
  true
),
(
  'inspection_condition',
  'How is equipment condition guaranteed?',
  'DRAFT - needs Cheesco approval: Cheesco conducts a mandatory pre-delivery inspection before equipment handover to the client, documenting operating hours and mechanical checklist items. A post-rental return inspection is also carried out upon project completion to verify equipment condition.',
  true
),
(
  'sourcing_requests',
  'What if the machinery I need is not listed on the site?',
  'DRAFT - needs Cheesco approval: If you need specialized machinery not currently listed in our public inventory, our operations desk provides tailored equipment sourcing through our network of fleet partners. Contact our team via the Support or Contact page with your specifications, location, and dates.',
  true
),
(
  'pricing_rates',
  'How are rental rates and prices calculated?',
  'DRAFT - needs Cheesco approval: Rental rates displayed on Cheesco represent the daily base rate adjusted for transparent platform operations. Final commercial quotations include mobilization/demobilization, duration discounts, and applicable taxes with no hidden charges.',
  true
),
(
  'contact_support',
  'How do I contact Cheesco operations or get human assistance?',
  'DRAFT - needs Cheesco approval: You can reach the Cheesco operations desk 24/7 through our Support page (/support), by opening a support ticket, or by contacting our operations hotline. Our team responds within 2 hours for active site and machinery inquiries.',
  true
)
ON CONFLICT DO NOTHING;

COMMIT;
