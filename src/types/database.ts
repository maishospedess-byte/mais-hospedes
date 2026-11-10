// Auto-generated types would come from `supabase gen types typescript`
// This is the manual base until Supabase project is connected

export type UserRole = 'owner' | 'manager' | 'receptionist'
export type PlanTier = 'essencial' | 'profissional' | 'premium'
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'cancelled' | 'suspended'
export type RegistrationStatus = 'registration_pending' | 'registration_blocked'
export type StayStatus = 'stay_active' | 'stay_completed' | 'cancelled'
export type MessageDirection = 'outbound' | 'inbound'
export type MessageStatus = 'scheduled' | 'queued' | 'sent' | 'delivered' | 'read' | 'failed' | 'cancelled'
export type WhatsAppConnectionStatus = 'not_connected' | 'pending_verification' | 'connected' | 'disconnected' | 'error'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent'
export type GuestLanguage = 'pt-BR' | 'es' | 'en'

export interface Organization {
  id: string
  name: string
  owner_user_id: string | null
  country: string
  currency: string
  timezone: string
  created_at: string
  updated_at: string
}

export interface Hotel {
  id: string
  organization_id: string
  name: string
  slug: string
  phone: string | null
  whatsapp_number: string | null
  instagram_url: string | null
  google_review_url: string | null
  checkin_time: string | null
  checkout_time: string | null
  breakfast_time: string | null
  wifi_info: string | null
  rules: string | null
  reception_contact: string | null
  timezone: string
  primary_language: string
  country: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  is_super_admin: boolean
  created_at: string
  updated_at: string
}

export interface HotelMembership {
  id: string
  user_id: string
  hotel_id: string
  role: UserRole
  is_active: boolean
  invited_by: string | null
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  tier: PlanTier
  name: string
  price_cents: number
  stay_limit: number
  user_limit: number
  hotel_limit: number
  features: Record<string, boolean>
  is_active: boolean
  created_at: string
}

export interface Subscription {
  id: string
  organization_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_ends_at: string | null
  current_period_start: string
  current_period_end: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

export interface GuestProfile {
  id: string
  hotel_id: string
  full_name: string
  whatsapp_number: string
  email: string | null
  language: GuestLanguage
  created_at: string
  updated_at: string
}

export interface Registration {
  id: string
  hotel_id: string
  guest_id: string
  status: RegistrationStatus
  idempotency_key: string
  checkin_date: string
  checkout_date: string
  guest_count: number | null
  ip_address: string | null
  user_agent: string | null
  blocked_by: string | null
  blocked_at: string | null
  block_reason: string | null
  created_at: string
  updated_at: string
}

export interface Stay {
  id: string
  hotel_id: string
  registration_id: string
  guest_id: string
  status: StayStatus
  checkin_date: string
  checkout_date: string
  confirmed_by: string | null
  confirmed_at: string | null
  completed_by: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface ConsentRecord {
  id: string
  hotel_id: string
  guest_id: string
  registration_id: string
  consent_type: string
  consented: boolean
  consent_text: string
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface OptOutRecord {
  id: string
  hotel_id: string
  whatsapp_number: string
  opted_out_at: string
  source: string
  created_at: string
}

export interface Message {
  id: string
  hotel_id: string
  guest_id: string | null
  stay_id: string | null
  direction: MessageDirection
  status: MessageStatus
  whatsapp_message_id: string | null
  template_id: string | null
  automation_type: string | null
  content: string | null
  language: string
  scheduled_for: string | null
  sent_at: string | null
  delivered_at: string | null
  read_at: string | null
  failed_at: string | null
  failure_reason: string | null
  idempotency_key: string | null
  created_at: string
  updated_at: string
}

export interface SatisfactionResponse {
  id: string
  hotel_id: string
  stay_id: string
  guest_id: string
  score: number
  message_id: string | null
  responded_at: string
  created_at: string
}

// Supabase Database type (placeholder — run `supabase gen types typescript` for proper types)
type Tbl<T> = { Row: T; Insert: Partial<T>; Update: Partial<T>; Relationships: [] }

export interface Database {
  public: {
    Tables: {
      organizations: Tbl<Organization>
      hotels: Tbl<Hotel>
      users: Tbl<User>
      hotel_memberships: Tbl<HotelMembership>
      plans: Tbl<Plan>
      subscriptions: Tbl<Subscription>
      guest_profiles: Tbl<GuestProfile>
      registrations: Tbl<Registration>
      stays: Tbl<Stay>
      consent_records: Tbl<ConsentRecord>
      opt_out_records: Tbl<OptOutRecord>
      messages: Tbl<Message>
      satisfaction_responses: Tbl<SatisfactionResponse>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
      plan_tier: PlanTier
      subscription_status: SubscriptionStatus
      registration_status: RegistrationStatus
      stay_status: StayStatus
      message_direction: MessageDirection
      message_status: MessageStatus
      whatsapp_connection_status: WhatsAppConnectionStatus
      ticket_status: TicketStatus
      ticket_priority: TicketPriority
    }
  }
}
