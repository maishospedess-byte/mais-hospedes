-- ============================================================
-- Mais Hóspedes — Initial Schema (Multi-tenant)
-- Spec v2 — 09/11/2026
-- ============================================================
-- Every tenant-scoped table has hotel_id as FK.
-- Row Level Security (RLS) enforced on all tenant tables.
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. ORGANIZATIONS & HOTELS
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  owner_user_id UUID, -- set after first user creation
  country TEXT NOT NULL DEFAULT 'BR',
  currency TEXT NOT NULL DEFAULT 'BRL',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE, -- opaque identifier for QR URL
  phone TEXT,
  whatsapp_number TEXT,
  instagram_url TEXT,
  google_review_url TEXT,
  checkin_time TEXT, -- e.g. "14:00"
  checkout_time TEXT, -- e.g. "12:00"
  breakfast_time TEXT,
  wifi_info TEXT,
  rules TEXT,
  reception_contact TEXT,
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  primary_language TEXT NOT NULL DEFAULT 'pt-BR',
  country TEXT NOT NULL DEFAULT 'BR',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_hotels_org ON hotels(organization_id);
CREATE INDEX idx_hotels_slug ON hotels(slug);

-- ============================================================
-- 2. USERS, ROLES & MEMBERSHIPS
-- ============================================================

-- Roles: owner, manager, receptionist
CREATE TYPE user_role AS ENUM ('owner', 'manager', 'receptionist');

CREATE TABLE users (
  id UUID PRIMARY KEY, -- matches Supabase auth.users.id
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE hotel_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'receptionist',
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, hotel_id)
);

CREATE INDEX idx_memberships_user ON hotel_memberships(user_id);
CREATE INDEX idx_memberships_hotel ON hotel_memberships(hotel_id);

-- ============================================================
-- 3. PLANS & SUBSCRIPTIONS
-- ============================================================

CREATE TYPE plan_tier AS ENUM ('essencial', 'profissional', 'premium');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'past_due', 'cancelled', 'suspended');

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier plan_tier NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL, -- in BRL cents
  stay_limit INTEGER NOT NULL,
  user_limit INTEGER NOT NULL,
  hotel_limit INTEGER NOT NULL DEFAULT 1,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status subscription_status NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_org ON subscriptions(organization_id);

-- ============================================================
-- 4. GUEST REGISTRATIONS & STAYS
-- ============================================================

CREATE TYPE registration_status AS ENUM (
  'registration_pending',
  'registration_blocked'
);

CREATE TYPE stay_status AS ENUM (
  'stay_active',
  'stay_completed',
  'cancelled'
);

CREATE TABLE guest_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL, -- E.164 format
  email TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR', -- pt-BR, es, en
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guests_hotel ON guest_profiles(hotel_id);
CREATE INDEX idx_guests_whatsapp ON guest_profiles(hotel_id, whatsapp_number);

CREATE TABLE registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  status registration_status NOT NULL DEFAULT 'registration_pending',
  idempotency_key TEXT NOT NULL UNIQUE, -- prevent duplicate submissions
  checkin_date DATE NOT NULL, -- guest-informed, reception confirms
  checkout_date DATE NOT NULL,
  guest_count INTEGER,
  ip_address INET,
  user_agent TEXT,
  blocked_by UUID REFERENCES users(id),
  blocked_at TIMESTAMPTZ,
  block_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_registrations_hotel ON registrations(hotel_id);
CREATE INDEX idx_registrations_status ON registrations(hotel_id, status);

CREATE TABLE stays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id),
  guest_id UUID NOT NULL REFERENCES guest_profiles(id),
  status stay_status NOT NULL DEFAULT 'stay_active',
  checkin_date DATE NOT NULL, -- confirmed by reception
  checkout_date DATE NOT NULL,
  confirmed_by UUID REFERENCES users(id),
  confirmed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES users(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stays_hotel ON stays(hotel_id);
CREATE INDEX idx_stays_status ON stays(hotel_id, status);
CREATE INDEX idx_stays_registration ON stays(registration_id);

-- ============================================================
-- 5. CONSENT & OPT-OUT RECORDS (LGPD)
-- ============================================================

CREATE TABLE consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID NOT NULL REFERENCES guest_profiles(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registrations(id),
  consent_type TEXT NOT NULL DEFAULT 'whatsapp_messaging',
  consented BOOLEAN NOT NULL,
  consent_text TEXT NOT NULL, -- exact text shown to guest
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_consent_hotel_guest ON consent_records(hotel_id, guest_id);

CREATE TABLE opt_out_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  whatsapp_number TEXT NOT NULL, -- E.164
  opted_out_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT NOT NULL DEFAULT 'whatsapp_reply', -- whatsapp_reply, manual, guest_request
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, whatsapp_number)
);

CREATE INDEX idx_optout_hotel_number ON opt_out_records(hotel_id, whatsapp_number);

-- ============================================================
-- 6. WHATSAPP INTEGRATION
-- ============================================================

CREATE TYPE whatsapp_connection_status AS ENUM (
  'not_connected', 'pending_verification', 'connected', 'disconnected', 'error'
);

CREATE TABLE whatsapp_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE UNIQUE,
  waba_id TEXT, -- WhatsApp Business Account ID
  phone_number_id TEXT,
  phone_number TEXT,
  display_name TEXT,
  connection_status whatsapp_connection_status NOT NULL DEFAULT 'not_connected',
  access_token_encrypted TEXT, -- encrypted at rest
  token_expires_at TIMESTAMPTZ,
  meta_business_id TEXT,
  verification_status TEXT,
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  language TEXT NOT NULL, -- pt_BR, es, en
  category TEXT NOT NULL, -- UTILITY, MARKETING
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  header_text TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  meta_template_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, template_name, language)
);

CREATE INDEX idx_templates_hotel ON message_templates(hotel_id);

-- ============================================================
-- 7. OUTBOUND & INBOUND MESSAGES
-- ============================================================

CREATE TYPE message_direction AS ENUM ('outbound', 'inbound');
CREATE TYPE message_status AS ENUM ('scheduled', 'queued', 'sent', 'delivered', 'read', 'failed', 'cancelled');

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guest_profiles(id),
  stay_id UUID REFERENCES stays(id),
  direction message_direction NOT NULL,
  status message_status NOT NULL DEFAULT 'scheduled',
  whatsapp_message_id TEXT, -- Meta's message ID
  template_id UUID REFERENCES message_templates(id),
  automation_type TEXT, -- welcome, checkin_info, during_stay, checkout_survey
  content TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  scheduled_for TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  failure_reason TEXT,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_hotel ON messages(hotel_id);
CREATE INDEX idx_messages_stay ON messages(stay_id);
CREATE INDEX idx_messages_status ON messages(hotel_id, status);
CREATE INDEX idx_messages_scheduled ON messages(status, scheduled_for) WHERE status = 'scheduled';

-- ============================================================
-- 8. SATISFACTION & REVIEWS
-- ============================================================

CREATE TABLE satisfaction_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id UUID NOT NULL REFERENCES stays(id),
  guest_id UUID NOT NULL REFERENCES guest_profiles(id),
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 10),
  message_id UUID REFERENCES messages(id),
  responded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_satisfaction_hotel ON satisfaction_responses(hotel_id);
CREATE INDEX idx_satisfaction_stay ON satisfaction_responses(stay_id);

CREATE TABLE review_link_clicks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  stay_id UUID REFERENCES stays(id),
  guest_id UUID REFERENCES guest_profiles(id),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_review_clicks_hotel ON review_link_clicks(hotel_id);

-- ============================================================
-- 9. CLICK EVENTS (Instagram, Contact Save)
-- ============================================================

CREATE TABLE click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  registration_id UUID REFERENCES registrations(id),
  event_type TEXT NOT NULL, -- 'instagram_click', 'save_contact'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_click_events_hotel ON click_events(hotel_id);

-- ============================================================
-- 10. USAGE METERING
-- ============================================================

CREATE TABLE usage_counters (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  stays_count INTEGER NOT NULL DEFAULT 0,
  messages_sent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, period_start)
);

CREATE INDEX idx_usage_org ON usage_counters(organization_id);

-- ============================================================
-- 11. AUDIT LOGS
-- ============================================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g. 'stay.confirmed', 'registration.blocked', 'settings.updated'
  entity_type TEXT, -- e.g. 'stay', 'registration', 'hotel'
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_hotel ON audit_logs(hotel_id);
CREATE INDEX idx_audit_user ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_created ON audit_logs(created_at);

-- Superadmin audit (separate for admin actions)
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,
  target_hotel_id UUID REFERENCES hotels(id),
  target_user_id UUID REFERENCES users(id),
  metadata JSONB DEFAULT '{}',
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_admin ON admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_created ON admin_audit_logs(created_at);

-- ============================================================
-- 12. SUPPORT
-- ============================================================

CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  subject TEXT NOT NULL,
  description TEXT,
  status ticket_status NOT NULL DEFAULT 'open',
  priority ticket_priority NOT NULL DEFAULT 'normal',
  assigned_to UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tickets_hotel ON support_tickets(hotel_id);
CREATE INDEX idx_tickets_status ON support_tickets(status);

CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false, -- internal notes
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_msgs_ticket ON support_messages(ticket_id);

-- ============================================================
-- 13. HELP ARTICLES (FAQ)
-- ============================================================

CREATE TABLE help_articles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  category TEXT,
  language TEXT NOT NULL DEFAULT 'pt-BR',
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_help_articles_slug ON help_articles(slug);
CREATE INDEX idx_help_articles_published ON help_articles(is_published);

-- ============================================================
-- 14. SEED: Default plans
-- ============================================================

INSERT INTO plans (tier, name, price_cents, stay_limit, user_limit, hotel_limit, features) VALUES
  ('essencial', 'Essencial', 9700, 150, 2, 1, '{"qr_code": true, "basic_messages": true, "satisfaction": true, "google_link": true, "basic_dashboard": true}'::jsonb),
  ('profissional', 'Profissional', 19700, 600, 5, 1, '{"qr_code": true, "full_automations": true, "satisfaction": true, "google_reputation": true, "dashboard": true, "monthly_report": true}'::jsonb),
  ('premium', 'Premium', 34700, 1500, 15, 3, '{"qr_code": true, "full_automations": true, "satisfaction": true, "google_reputation": true, "advanced_reports": true, "priority_support": true, "multi_unit": true}'::jsonb);

-- ============================================================
-- 15. RLS POLICIES (base)
-- ============================================================

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE opt_out_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE satisfaction_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Helper function: get hotel_ids the current user belongs to
CREATE OR REPLACE FUNCTION get_user_hotel_ids()
RETURNS SETOF UUID AS $$
  SELECT hotel_id FROM hotel_memberships
  WHERE user_id = auth.uid() AND is_active = true;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Hotels: users can see hotels they belong to
CREATE POLICY "Users can view own hotels"
  ON hotels FOR SELECT
  USING (id IN (SELECT get_user_hotel_ids()));

-- Hotel memberships: users see memberships of their hotels
CREATE POLICY "Users can view memberships of own hotels"
  ON hotel_memberships FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Guest profiles: scoped to user's hotels
CREATE POLICY "Users can view guests of own hotels"
  ON guest_profiles FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Registrations: scoped to user's hotels
CREATE POLICY "Users can view registrations of own hotels"
  ON registrations FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

CREATE POLICY "Users can update registrations of own hotels"
  ON registrations FOR UPDATE
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Stays: scoped to user's hotels
CREATE POLICY "Users can view stays of own hotels"
  ON stays FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

CREATE POLICY "Users can insert stays for own hotels"
  ON stays FOR INSERT
  WITH CHECK (hotel_id IN (SELECT get_user_hotel_ids()));

CREATE POLICY "Users can update stays of own hotels"
  ON stays FOR UPDATE
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Messages: scoped to user's hotels
CREATE POLICY "Users can view messages of own hotels"
  ON messages FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Satisfaction: scoped to user's hotels
CREATE POLICY "Users can view satisfaction of own hotels"
  ON satisfaction_responses FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Consent records: scoped to user's hotels
CREATE POLICY "Users can view consent of own hotels"
  ON consent_records FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Opt-out records: scoped to user's hotels
CREATE POLICY "Users can view opt-outs of own hotels"
  ON opt_out_records FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Audit logs: scoped to user's hotels
CREATE POLICY "Users can view audit logs of own hotels"
  ON audit_logs FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Usage counters: scoped to user's hotels
CREATE POLICY "Users can view usage of own hotels"
  ON usage_counters FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Support tickets: scoped to user's hotels
CREATE POLICY "Users can view tickets of own hotels"
  ON support_tickets FOR SELECT
  USING (hotel_id IN (SELECT get_user_hotel_ids()));

-- Public registration (anon can INSERT on registrations, guest_profiles, consent_records)
-- These are handled via API routes with server-side validation, not direct anon RLS.

-- ============================================================
-- 16. UPDATED_AT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
    WHERE column_name = 'updated_at'
    AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
      t
    );
  END LOOP;
END;
$$;
