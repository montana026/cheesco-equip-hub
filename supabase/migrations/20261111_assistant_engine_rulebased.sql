-- ============================================================================
-- Migration: 20261111_assistant_engine_rulebased.sql
-- Description: Rule-Based Guided Assistant Engine tables & schema:
--   1. chat_logs (with intent, matched_flow, is_unknown, request_reference)
--   2. faq_entries (with 10 approved FAQ seeds)
--   3. assistant_sessions (server-side conversational state machine storage)
--   4. requests & request_events (for quote, rental, offer, sourcing flows)
-- Notes:
--   - Fully idempotent (safe to re-run with IF NOT EXISTS)
--   - No LLM dependency
--   - Never mention escrow
-- ============================================================================

BEGIN;

-- 1. Ensure chat_logs table exists and has rule-based tracking columns
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

ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS matched_flow TEXT;
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS is_unknown BOOLEAN DEFAULT false;
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS request_id UUID;
ALTER TABLE public.chat_logs ADD COLUMN IF NOT EXISTS request_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_chat_logs_session_id ON public.chat_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_logs_intent ON public.chat_logs(intent);
CREATE INDEX IF NOT EXISTS idx_chat_logs_is_unknown ON public.chat_logs(is_unknown);
CREATE INDEX IF NOT EXISTS idx_chat_logs_created_at ON public.chat_logs(created_at DESC);

ALTER TABLE public.chat_logs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_logs FROM anon, authenticated;

-- 2. Ensure faq_entries table exists and has RLS
CREATE TABLE IF NOT EXISTS public.faq_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_faq_entries_topic ON public.faq_entries(topic);
CREATE INDEX IF NOT EXISTS idx_faq_entries_published ON public.faq_entries(published);

ALTER TABLE public.faq_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view published faq entries" ON public.faq_entries;
CREATE POLICY "Public can view published faq entries"
  ON public.faq_entries
  FOR SELECT
  TO anon, authenticated
  USING (published = true);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.faq_entries FROM anon, authenticated;
GRANT SELECT ON public.faq_entries TO anon, authenticated;

-- 3. Seed 10 Phase 1 FAQ Entries
INSERT INTO public.faq_entries (topic, question, answer, published) VALUES
(
  'how_cheesco_works',
  'What is Cheesco Equip Hub and how does it work?',
  'Cheesco Equip Hub is an intermediary platform connecting project contractors, construction firms, and industrial clients with vetted equipment owners and verified fleet partners across Nigeria. Cheesco facilitates equipment discovery, quotes, verification, and mobilization without owning the machinery directly.',
  true
),
(
  'merchant_verification',
  'How are equipment owners and listings verified?',
  'Every equipment merchant on Cheesco undergoes a comprehensive verification process, including Corporate Affairs Commission (CAC) business validation, identity checks, and equipment asset proof. Equipment listings are reviewed by Cheesco operations before being marked with the Cheesco Verified badge.',
  true
),
(
  'rental_process',
  'How do I rent equipment on Cheesco?',
  'Renting follows a clear 6-step managed workflow: 1. Find machinery matching your project requirements. 2. Request a booking with location and duration. 3. Cheesco operations reviews equipment and merchant availability. 4. Cheesco generates an itemized commercial quotation. 5. You review terms and confirm payment. 6. Logistics mobilization and delivery to your site with pre-delivery inspection.',
  true
),
(
  'purchase_process',
  'How do I buy heavy machinery on Cheesco?',
  'To purchase equipment: 1. Explore available for-sale listings. 2. Submit a purchase enquiry or offer on the listing detail page. 3. Cheesco coordinates physical asset inspection and documentation verification. 4. A formal sales agreement is executed. 5. Payment is completed and title transfer/handover is finalized.',
  true
),
(
  'delivery_mobilization',
  'Who handles equipment delivery and transport?',
  'Delivery is coordinated through Cheesco logistics partners using dedicated lowbed and flatbed carriers across Nigeria. Mobilization and demobilization fees depend on project location, distance, and transport permits, which are clearly itemized in your commercial quotation.',
  true
),
(
  'operators',
  'Are operators included with equipment rentals?',
  'Many listings indicate whether a certified operator is included or available as an option. You can see this directly on each equipment card and detail page (Operator Included badge). If an operator is not included, Cheesco can assist in arranging a certified operator upon request.',
  true
),
(
  'inspection_condition',
  'How is equipment condition guaranteed?',
  'Cheesco conducts a mandatory pre-delivery inspection before equipment handover to the client, documenting operating hours and mechanical checklist items. A post-rental return inspection is also carried out upon project completion to verify equipment condition.',
  true
),
(
  'sourcing_requests',
  'What if the machinery I need is not listed on the site?',
  'If you need specialized machinery not currently listed in our public inventory, our operations desk provides tailored equipment sourcing through our network of fleet partners. Contact our team via the Support or Contact page with your specifications, location, and dates.',
  true
),
(
  'pricing_rates',
  'How are rental rates and prices calculated?',
  'Rental rates displayed on Cheesco represent the daily base rate adjusted for transparent platform operations. Final commercial quotations include mobilization/demobilization, duration discounts, and applicable taxes with no hidden charges.',
  true
),
(
  'contact_support',
  'How do I contact Cheesco operations or get human assistance?',
  'You can reach the Cheesco operations desk 24/7 through our Support page (/support), by opening a support ticket, or by contacting our operations hotline. Our team responds within 2 hours for active site and machinery inquiries.',
  true
)
ON CONFLICT DO NOTHING;

-- 4. Server-Side Assistant Sessions Table (State Machine Persistence)
CREATE TABLE IF NOT EXISTS public.assistant_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  current_flow TEXT NOT NULL DEFAULT 'idle',
  step TEXT NOT NULL DEFAULT 'start',
  collected_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  miss_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assistant_sessions_session_id ON public.assistant_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_assistant_sessions_updated_at ON public.assistant_sessions(updated_at DESC);

ALTER TABLE public.assistant_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assistant_sessions FROM anon, authenticated;

-- 5. Requests Table (Quote, Rental, Offer, Sourcing)
CREATE TABLE IF NOT EXISTS public.requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('quote', 'rental', 'offer', 'sourcing')),
  equipment_id UUID REFERENCES public.equipment(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'quoted', 'in_progress', 'completed', 'declined', 'cancelled')),
  customer_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  contact JSONB NOT NULL,
  details JSONB NOT NULL,
  source TEXT NOT NULL DEFAULT 'assistant_engine',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requests_reference ON public.requests(reference);
CREATE INDEX IF NOT EXISTS idx_requests_customer_id ON public.requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_requests_equipment_id ON public.requests(equipment_id);
CREATE INDEX IF NOT EXISTS idx_requests_status ON public.requests(status);
CREATE INDEX IF NOT EXISTS idx_requests_type ON public.requests(type);
CREATE INDEX IF NOT EXISTS idx_requests_created_at ON public.requests(created_at DESC);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own requests" ON public.requests;
CREATE POLICY "Users can view their own requests"
  ON public.requests
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

REVOKE INSERT, UPDATE, DELETE ON public.requests FROM anon, authenticated;
REVOKE SELECT ON public.requests FROM anon;

-- 6. Request Events Table (Audit Trail)
CREATE TABLE IF NOT EXISTS public.request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_request_events_request_id ON public.request_events(request_id);
CREATE INDEX IF NOT EXISTS idx_request_events_created_at ON public.request_events(created_at DESC);

ALTER TABLE public.request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view events for their own requests" ON public.request_events;
CREATE POLICY "Users can view events for their own requests"
  ON public.request_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = public.request_events.request_id
        AND r.customer_id = auth.uid()
    )
  );

REVOKE INSERT, UPDATE, DELETE ON public.request_events FROM anon, authenticated;
REVOKE SELECT ON public.request_events FROM anon;

COMMIT;
