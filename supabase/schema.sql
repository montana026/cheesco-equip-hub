-- CHEESCO EQUIP HUB DATABASE SCHEMA
-- PostgreSQL / Supabase Schema for Production Deployment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & AUTHENTICATION
-- ============================================================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
  'CUSTOMER',
  'MERCHANT',
  'OPERATIONS_ADMIN',
  'VERIFICATION_ADMIN',
  'FINANCE_ADMIN',
  'SUPPORT_ADMIN',
  'SUPER_ADMIN'
);

-- Users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  avatar_url TEXT,
  email_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MERCHANT SYSTEM
-- ============================================================================

CREATE TYPE merchant_verification_status AS ENUM (
  'NOT_STARTED',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TABLE merchant_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_address TEXT,
  business_registration_number TEXT,
  business_phone TEXT,
  verification_status merchant_verification_status DEFAULT 'NOT_STARTED',
  verification_notes TEXT,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merchant verification documents
CREATE TABLE merchant_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'ID_CARD', 'BUSINESS_REG', 'TAX_CERT', etc.
  document_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EQUIPMENT LISTINGS
-- ============================================================================

CREATE TYPE equipment_category AS ENUM (
  'Excavators',
  'Cranes',
  'Trucks',
  'Bulldozers',
  'Loaders',
  'Generators',
  'Lowbeds',
  'Forklifts',
  'Compactors',
  'Other'
);

CREATE TYPE listing_type AS ENUM (
  'FOR_SALE',
  'FOR_RENT',
  'FOR_SALE_AND_RENT'
);

CREATE TYPE equipment_condition AS ENUM (
  'NEW',
  'USED_EXCELLENT',
  'USED_GOOD',
  'USED_FAIR'
);

CREATE TYPE equipment_verification_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'MORE_INFORMATION_REQUIRED',
  'VERIFIED',
  'REJECTED',
  'SUSPENDED'
);

CREATE TYPE availability_status AS ENUM (
  'AVAILABLE',
  'RENTED',
  'RESERVED',
  'MAINTENANCE',
  'UNAVAILABLE'
);

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category equipment_category NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  condition equipment_condition NOT NULL,
  location_state TEXT NOT NULL,
  location_city TEXT NOT NULL,
  operating_hours INTEGER DEFAULT 0,
  description TEXT,
  specs JSONB DEFAULT '{}',
  listing_type listing_type NOT NULL,
  sale_price DECIMAL(12,2),
  merchant_rental_rate DECIMAL(12,2), -- per day base rate
  cheesco_adjusted_rate DECIMAL(12,2), -- per day after Cheesco margin
  is_operator_included BOOLEAN DEFAULT FALSE,
  is_delivery_available BOOLEAN DEFAULT TRUE,
  verification_status equipment_verification_status DEFAULT 'DRAFT',
  availability_status availability_status DEFAULT 'AVAILABLE',
  is_featured BOOLEAN DEFAULT FALSE,
  promotion_tier TEXT,
  promotion_expires_at TIMESTAMPTZ,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment images
CREATE TABLE equipment_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  display_order INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment private documents (only Cheesco ops can view)
CREATE TABLE equipment_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Equipment availability calendar
CREATE TABLE equipment_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  blocked_from DATE NOT NULL,
  blocked_to DATE NOT NULL,
  reason TEXT, -- 'RENTED', 'MAINTENANCE', 'RESERVED', 'BLOCKED'
  rental_request_id UUID, -- Reference to rental if applicable
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_overlap EXCLUDE USING gist (
    equipment_id WITH =,
    daterange(blocked_from, blocked_to, '[]') WITH &&
  )
);

-- ============================================================================
-- RENTAL TRANSACTION LIFECYCLE
-- ============================================================================

CREATE TYPE rental_state AS ENUM (
  'REQUEST_SUBMITTED',
  'CHEESCO_REVIEWING',
  'EQUIPMENT_VERIFICATION_CHECK',
  'AVAILABILITY_CONFIRMED',
  'QUOTATION_DRAFTED',
  'QUOTATION_SENT',
  'QUOTATION_VIEWED',
  'QUOTATION_ACCEPTED',
  'QUOTATION_REVISION_REQUESTED',
  'AGREEMENT_GENERATED',
  'AGREEMENT_SENT',
  'AGREEMENT_SIGNED',
  'PAYMENT_PENDING',
  'PAYMENT_PARTIALLY_RECEIVED',
  'PAYMENT_CONFIRMED',
  'DEPOSIT_HELD',
  'LOGISTICS_PENDING',
  'CARRIER_ASSIGNED',
  'IN_TRANSIT',
  'PRE_DELIVERY_INSPECTION',
  'DELIVERED',
  'RENTAL_ACTIVE',
  'RETURN_SCHEDULED',
  'RETURN_IN_PROGRESS',
  'POST_RENTAL_INSPECTION',
  'DEPOSIT_SETTLEMENT',
  'COMPLETED',
  'CANCELLED',
  'DISPUTED'
);

CREATE TABLE rental_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id),

  -- Rental details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  duration_days INTEGER NOT NULL,
  project_location TEXT NOT NULL,
  project_type TEXT,
  operator_required BOOLEAN DEFAULT FALSE,
  delivery_required BOOLEAN DEFAULT TRUE,
  additional_requirements TEXT,

  -- State machine
  current_state rental_state DEFAULT 'REQUEST_SUBMITTED',

  -- Operations tracking
  assigned_to UUID REFERENCES users(id), -- Operations admin assigned
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rental state history (audit trail)
CREATE TABLE rental_state_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  from_state rental_state,
  to_state rental_state NOT NULL,
  changed_by UUID REFERENCES users(id),
  notes TEXT,
  transitioned_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- QUOTATIONS
-- ============================================================================

CREATE TYPE quotation_status AS ENUM (
  'DRAFT',
  'SENT',
  'VIEWED',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
  'REVISION_REQUESTED',
  'CANCELLED'
);

CREATE TABLE quotations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID UNIQUE NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  reference_number TEXT UNIQUE NOT NULL,

  -- Pricing breakdown
  merchant_base_rate DECIMAL(12,2) NOT NULL, -- per day
  cheesco_margin_rate DECIMAL(5,2) NOT NULL, -- percentage
  cheesco_managed_rate DECIMAL(12,2) NOT NULL, -- per day after margin
  line_items JSONB DEFAULT '[]', -- Array of {label, amount, note}

  -- Totals
  subtotal DECIMAL(12,2) NOT NULL,
  deposit_amount DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  merchant_payout_total DECIMAL(12,2) NOT NULL,
  cheesco_gross_margin DECIMAL(12,2) NOT NULL,

  status quotation_status DEFAULT 'DRAFT',
  valid_until TIMESTAMPTZ NOT NULL,
  terms TEXT,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RENTAL AGREEMENTS
-- ============================================================================

CREATE TABLE rental_agreements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID UNIQUE NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  quotation_id UUID NOT NULL REFERENCES quotations(id),
  agreement_document_url TEXT,
  terms_and_conditions TEXT NOT NULL,
  customer_signed_at TIMESTAMPTZ,
  customer_ip_address INET,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PAYMENTS & DEPOSITS
-- ============================================================================

CREATE TYPE payment_type AS ENUM (
  'RENTAL_FEE',
  'DAMAGE_DEPOSIT',
  'SALE_PAYMENT',
  'AD_CAMPAIGN_FEE'
);

CREATE TYPE payment_status AS ENUM (
  'PENDING',
  'PROCESSING',
  'CONFIRMED',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED'
);

CREATE TYPE deposit_status AS ENUM (
  'HELD',
  'RELEASED',
  'PARTIALLY_DEDUCTED',
  'FULLY_DEDUCTED'
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID REFERENCES rental_requests(id),
  quotation_id UUID REFERENCES quotations(id),
  payer_id UUID NOT NULL REFERENCES users(id),

  amount DECIMAL(12,2) NOT NULL,
  currency TEXT DEFAULT 'NGN',
  payment_type payment_type NOT NULL,
  status payment_status DEFAULT 'PENDING',

  -- Payment gateway details
  payment_reference TEXT UNIQUE, -- Paystack reference
  payment_gateway TEXT DEFAULT 'PAYSTACK',
  gateway_response JSONB,

  -- Deposit tracking
  deposit_status deposit_status,
  deposit_deduction_amount DECIMAL(12,2),
  deposit_released_at TIMESTAMPTZ,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- LOGISTICS & DELIVERY
-- ============================================================================

CREATE TYPE logistics_status AS ENUM (
  'PENDING',
  'ASSIGNED',
  'PREPARING',
  'DISPATCHED',
  'IN_TRANSIT',
  'ARRIVED',
  'DELIVERED',
  'FAILED',
  'CANCELLED'
);

CREATE TABLE logistics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID UNIQUE NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,

  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  logistics_partner_name TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  vehicle_number TEXT,

  estimated_departure TIMESTAMPTZ,
  estimated_arrival TIMESTAMPTZ,
  actual_departure TIMESTAMPTZ,
  actual_arrival TIMESTAMPTZ,

  status logistics_status DEFAULT 'PENDING',
  tracking_notes TEXT,

  assigned_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EQUIPMENT INSPECTIONS
-- ============================================================================

CREATE TYPE inspection_kind AS ENUM (
  'PRE_DELIVERY',
  'POST_RENTAL'
);

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  kind inspection_kind NOT NULL,

  inspector_name TEXT NOT NULL,
  inspector_id UUID REFERENCES users(id),
  hour_meter_reading INTEGER,

  checklist JSONB DEFAULT '[]', -- Array of {item, passed, note}
  condition_photos JSONB DEFAULT '[]', -- Array of image URLs
  inspection_notes TEXT,

  deposit_deduction_recommendation DECIMAL(12,2),

  inspected_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- OPERATORS
-- ============================================================================

CREATE TYPE operator_status AS ENUM (
  'AVAILABLE',
  'ASSIGNED',
  'ON_PROJECT',
  'UNAVAILABLE'
);

CREATE TABLE operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  equipment_types TEXT[], -- Array of equipment categories they can operate
  years_experience INTEGER,
  certifications JSONB DEFAULT '[]',
  verification_status merchant_verification_status DEFAULT 'NOT_STARTED',
  status operator_status DEFAULT 'AVAILABLE',
  location_state TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Operator assignments to rentals
CREATE TABLE rental_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID NOT NULL REFERENCES rental_requests(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES operators(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id)
);

-- ============================================================================
-- PURCHASE/SALES TRANSACTIONS
-- ============================================================================

CREATE TYPE sales_enquiry_status AS ENUM (
  'SUBMITTED',
  'UNDER_REVIEW',
  'QUOTATION_SENT',
  'NEGOTIATING',
  'TERMS_AGREED',
  'PAYMENT_PENDING',
  'PAYMENT_CONFIRMED',
  'COMPLETED',
  'DECLINED',
  'CANCELLED'
);

CREATE TABLE sales_enquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reference_number TEXT UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES users(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id),

  offered_price DECIMAL(12,2),
  customer_message TEXT,
  status sales_enquiry_status DEFAULT 'SUBMITTED',

  agreed_sale_price DECIMAL(12,2),
  cheesco_commission_pct DECIMAL(5,2) DEFAULT 5.0,
  cheesco_commission_amount DECIMAL(12,2),
  merchant_payout_amount DECIMAL(12,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- DISPUTES
-- ============================================================================

CREATE TYPE dispute_status AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'MERCHANT_RESPONSE_PENDING',
  'CUSTOMER_RESPONSE_PENDING',
  'RESOLVED',
  'CLOSED'
);

CREATE TABLE disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID REFERENCES rental_requests(id),
  sales_enquiry_id UUID REFERENCES sales_enquiries(id),
  raised_by UUID NOT NULL REFERENCES users(id),
  raised_against UUID REFERENCES users(id),

  dispute_type TEXT NOT NULL, -- 'DAMAGE', 'NON_DELIVERY', 'PAYMENT', etc.
  reason TEXT NOT NULL,
  evidence_urls JSONB DEFAULT '[]',

  status dispute_status DEFAULT 'OPEN',
  cheesco_ruling TEXT,
  deposit_deduction DECIMAL(12,2),

  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES users(id),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- REVIEWS & RATINGS
-- ============================================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_request_id UUID REFERENCES rental_requests(id),
  sales_enquiry_id UUID REFERENCES sales_enquiries(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id),

  equipment_condition_rating INTEGER CHECK (equipment_condition_rating BETWEEN 1 AND 5),
  merchant_experience_rating INTEGER CHECK (merchant_experience_rating BETWEEN 1 AND 5),
  communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
  delivery_rating INTEGER CHECK (delivery_rating BETWEEN 1 AND 5),
  overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),

  review_text TEXT,
  is_verified BOOLEAN DEFAULT TRUE, -- Only verified transactions can review

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT one_review_per_transaction UNIQUE (rental_request_id, reviewer_id)
);

-- ============================================================================
-- MESSAGING SYSTEM
-- ============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  rental_request_id UUID REFERENCES rental_requests(id),
  sales_enquiry_id UUID REFERENCES sales_enquiries(id),

  message_text TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

CREATE TYPE notification_type AS ENUM (
  'RENTAL_REQUEST',
  'QUOTATION',
  'PAYMENT',
  'LOGISTICS',
  'DELIVERY',
  'INSPECTION',
  'DISPUTE',
  'MESSAGE',
  'SYSTEM'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AD CAMPAIGNS
-- ============================================================================

CREATE TYPE ad_campaign_status AS ENUM (
  'PENDING_APPROVAL',
  'ACTIVE',
  'PAUSED',
  'EXPIRED',
  'CANCELLED'
);

CREATE TABLE ad_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchant_profiles(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  package_type TEXT NOT NULL,
  amount_paid DECIMAL(12,2) NOT NULL,
  duration_days INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status ad_campaign_status DEFAULT 'PENDING_APPROVAL',
  impressions_count INTEGER DEFAULT 0,
  clicks_count INTEGER DEFAULT 0,
  enquiries_count INTEGER DEFAULT 0,
  payment_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SUPPORT TICKETS
-- ============================================================================

CREATE TYPE ticket_status AS ENUM (
  'OPEN',
  'IN_PROGRESS',
  'AWAITING_CUSTOMER',
  'RESOLVED',
  'CLOSED'
);

CREATE TYPE ticket_priority AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number TEXT UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status ticket_status DEFAULT 'OPEN',
  priority ticket_priority DEFAULT 'MEDIUM',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOGS
-- ============================================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- SAVED EQUIPMENT (FAVORITES)
-- ============================================================================

CREATE TABLE saved_equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  saved_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, equipment_id)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Equipment
CREATE INDEX idx_equipment_merchant ON equipment(merchant_id);
CREATE INDEX idx_equipment_category ON equipment(category);
CREATE INDEX idx_equipment_verification_status ON equipment(verification_status);
CREATE INDEX idx_equipment_availability_status ON equipment(availability_status);
CREATE INDEX idx_equipment_slug ON equipment(slug);
CREATE INDEX idx_equipment_location_state ON equipment(location_state);
CREATE INDEX idx_equipment_created_at ON equipment(created_at DESC);

-- Rental requests
CREATE INDEX idx_rental_requests_customer ON rental_requests(customer_id);
CREATE INDEX idx_rental_requests_equipment ON rental_requests(equipment_id);
CREATE INDEX idx_rental_requests_merchant ON rental_requests(merchant_id);
CREATE INDEX idx_rental_requests_state ON rental_requests(current_state);
CREATE INDEX idx_rental_requests_reference ON rental_requests(reference_number);
CREATE INDEX idx_rental_requests_created_at ON rental_requests(created_at DESC);

-- Quotations
CREATE INDEX idx_quotations_rental_request ON quotations(rental_request_id);
CREATE INDEX idx_quotations_status ON quotations(status);

-- Payments
CREATE INDEX idx_payments_rental_request ON payments(rental_request_id);
CREATE INDEX idx_payments_payer ON payments(payer_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_reference ON payments(payment_reference);

-- Messages
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_recipient ON messages(recipient_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Audit logs
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_equipment ENABLE ROW LEVEL SECURITY;

-- Users can read and insert their own data
CREATE POLICY "Users can view own data" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Merchants can manage their own profile
CREATE POLICY "Merchants can view own profile" ON merchant_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Merchants can insert own profile" ON merchant_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Merchants can update own profile" ON merchant_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Equipment visibility based on verification status
CREATE POLICY "Public can view verified equipment" ON equipment
  FOR SELECT USING (verification_status = 'VERIFIED');

CREATE POLICY "Merchants can view own equipment" ON equipment
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Merchants can manage own equipment" ON equipment
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

-- Rental requests - customers see their own, merchants see theirs
CREATE POLICY "Customers can view own rentals" ON rental_requests
  FOR SELECT USING (customer_id = auth.uid());

CREATE POLICY "Merchants can view their equipment rentals" ON rental_requests
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchant_profiles WHERE user_id = auth.uid())
  );

-- Notifications - users can only see their own
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Messages - users can see messages they sent or received
CREATE POLICY "Users can view own messages" ON messages
  FOR SELECT USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Saved equipment
CREATE POLICY "Users can manage own saved equipment" ON saved_equipment
  FOR ALL USING (user_id = auth.uid());

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_merchant_profiles_updated_at BEFORE UPDATE ON merchant_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_requests_updated_at BEFORE UPDATE ON rental_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to log rental state transitions
CREATE OR REPLACE FUNCTION log_rental_state_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.current_state IS DISTINCT FROM NEW.current_state THEN
    INSERT INTO rental_state_history (rental_request_id, from_state, to_state, changed_by)
    VALUES (NEW.id, OLD.current_state, NEW.current_state, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER log_rental_state_changes AFTER UPDATE ON rental_requests
  FOR EACH ROW EXECUTE FUNCTION log_rental_state_transition();

-- Function to generate reference numbers
CREATE OR REPLACE FUNCTION generate_reference_number(prefix TEXT)
RETURNS TEXT AS $$
DECLARE
  random_suffix TEXT;
BEGIN
  random_suffix := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
  RETURN prefix || '-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || random_suffix;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INITIAL SEED DATA (DEMO ACCOUNTS)
-- ============================================================================

-- Note: In production, these would be created through proper auth flows
-- This is for development/testing only

COMMENT ON DATABASE postgres IS 'Cheesco Equip Hub - Heavy Equipment Marketplace & Managed Rental Platform';
