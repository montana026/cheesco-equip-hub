-- ============================================================================
-- REVIEWS & RATINGS
-- ============================================================================

CREATE TYPE review_status AS ENUM (
  'PENDING_MODERATION',
  'APPROVED',
  'REJECTED'
);

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  overall_rating DECIMAL(2,1) NOT NULL CHECK (overall_rating >= 0 AND overall_rating <= 5),
  equipment_condition_rating INTEGER NOT NULL CHECK (equipment_condition_rating >= 0 AND equipment_condition_rating <= 5),
  merchant_service_rating INTEGER NOT NULL CHECK (merchant_service_rating >= 0 AND merchant_service_rating <= 5),
  delivery_experience_rating INTEGER NOT NULL CHECK (delivery_experience_rating >= 0 AND delivery_experience_rating <= 5),
  value_for_money_rating INTEGER NOT NULL CHECK (value_for_money_rating >= 0 AND value_for_money_rating <= 5),
  review_text TEXT,
  would_recommend BOOLEAN,
  review_images JSONB DEFAULT '[]',
  status review_status DEFAULT 'PENDING_MODERATION',
  moderated_by UUID REFERENCES users(id),
  moderated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for reviews
CREATE INDEX idx_reviews_equipment_id ON reviews(equipment_id);
CREATE INDEX idx_reviews_merchant_id ON reviews(merchant_id);
CREATE INDEX idx_reviews_customer_id ON reviews(customer_id);
CREATE INDEX idx_reviews_status ON reviews(status);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  'INFO',
  'SUCCESS',
  'WARNING',
  'ERROR'
);

CREATE TYPE notification_category AS ENUM (
  'RENTAL_REQUEST',
  'QUOTATION',
  'PAYMENT',
  'LOGISTICS',
  'INSPECTION',
  'DEPOSIT',
  'AGREEMENT',
  'EQUIPMENT',
  'MERCHANT',
  'DISPUTE',
  'SYSTEM'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type notification_type NOT NULL DEFAULT 'INFO',
  category notification_category NOT NULL DEFAULT 'SYSTEM',
  reference_id UUID, -- Generic reference to related entity
  reference_type TEXT, -- Type of entity referenced
  action_url TEXT, -- URL to navigate to when clicked
  metadata JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Note: Storage buckets are created via Supabase Dashboard or CLI,
-- but we define them here for documentation and reference.

-- Equipment images (public)
CREATE POLICY "Public access to equipment images"
ON storage.objects FOR SELECT
USING (bucket_id = 'equipment-images');

CREATE POLICY "Authenticated users can upload equipment images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-images'
  AND auth.role() = 'authenticated'
);

-- Equipment documents (private)
CREATE POLICY "Admins can view equipment documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'equipment-documents'
  AND (
    auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'VERIFICATION_ADMIN', 'SUPER_ADMIN')
    OR auth.uid()::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Merchants can upload equipment documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'equipment-documents'
  AND auth.role() = 'authenticated'
);

-- Inspection photos (private)
CREATE POLICY "Authorized users can view inspection photos"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'inspection-photos'
  AND auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'SUPER_ADMIN', 'CUSTOMER')
);

CREATE POLICY "Admins can upload inspection photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'inspection-photos'
  AND auth.jwt() ->> 'role' IN ('OPERATIONS_ADMIN', 'SUPER_ADMIN')
);

-- Merchant verification documents (private)
CREATE POLICY "Admins can view merchant documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'merchant-documents'
  AND auth.jwt() ->> 'role' IN ('VERIFICATION_ADMIN', 'SUPER_ADMIN')
);

CREATE POLICY "Merchants can upload verification documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'merchant-documents'
  AND auth.role() = 'authenticated'
);

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================

CREATE TYPE ticket_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'WAITING_CUSTOMER',
  'WAITING_THIRD_PARTY',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE ticket_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE ticket_category AS ENUM (
  'RENTAL',
  'PAYMENT',
  'EQUIPMENT',
  'DELIVERY',
  'MERCHANT',
  'DISPUTE',
  'ACCOUNT',
  'OTHER'
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category ticket_category NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'OPEN',
  priority ticket_priority NOT NULL DEFAULT 'MEDIUM',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Support ticket messages
CREATE TABLE ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- True if from support staff
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for support tickets
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON support_tickets(priority);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_ticket_messages_ticket_id ON ticket_messages(ticket_id);

-- ============================================================================
-- MESSAGES (Internal Communication)
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL, -- References a conversation thread
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  attachment_urls JSONB DEFAULT '[]',
  read_by JSONB DEFAULT '[]', -- Array of user IDs who have read the message
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- ============================================================================
-- AD CAMPAIGNS (For Merchant Advertising)
-- ============================================================================

CREATE TYPE ad_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'PAUSED',
  'COMPLETED',
  'CANCELLED'
);

CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ad_type TEXT NOT NULL, -- 'HOMEPAGE_HERO', 'CATEGORY_TOP', etc.
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  budget DECIMAL(10,2) NOT NULL,
  spent DECIMAL(10,2) DEFAULT 0,
  status ad_status NOT NULL DEFAULT 'DRAFT',
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ad targeting
CREATE TABLE ad_targeting (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_campaign_id UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  equipment_categories TEXT[], -- Array of equipment categories
  location_states TEXT[], -- Array of Nigerian states
  min_budget DECIMAL(10,2),
  max_budget DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for ad campaigns
CREATE INDEX idx_ad_campaigns_merchant_id ON ad_campaigns(merchant_id);
CREATE INDEX idx_ad_campaigns_status ON ad_campaigns(status);
CREATE INDEX idx_ad_targeting_ad_campaign_id ON ad_targeting(ad_campaign_id);

-- ============================================================================
-- CORE OPERATIONAL & PERFORMANCE INDEXES (HOT QUERIES)
-- ============================================================================

CREATE INDEX idx_rental_requests_customer_id ON rental_requests(customer_id);
CREATE INDEX idx_rental_requests_merchant_id ON rental_requests(merchant_id);
CREATE INDEX idx_rental_requests_current_state ON rental_requests(current_state);
CREATE INDEX idx_payments_rental_request_id ON payments(rental_request_id);
CREATE INDEX idx_payments_payer_id ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_quotations_rental_request_id ON quotations(rental_request_id);
CREATE INDEX idx_equipment_merchant_id ON equipment(merchant_id);
CREATE INDEX idx_equipment_verification_status ON equipment(verification_status);
CREATE INDEX idx_equipment_availability_status ON equipment(availability_status);
