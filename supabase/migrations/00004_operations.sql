-- ============================================================
-- 00004 — Operação: estados, automações, logo, WhatsApp, logs
-- Idempotente: pode ser executado mais de uma vez.
-- Nenhum dado existente é apagado.
-- ============================================================

-- ---------- HOTELS: logomarca ----------
ALTER TABLE hotels ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- ---------- REGISTRATIONS: confirmação ----------
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS confirmed_by UUID REFERENCES users(id);

-- Corrige cadastros que já tinham estadia criada mas continuavam "pendentes"
UPDATE registrations r
SET status = 'registration_confirmed',
    confirmed_at = COALESCE(r.confirmed_at, s.confirmed_at, s.created_at),
    confirmed_by = COALESCE(r.confirmed_by, s.confirmed_by)
FROM stays s
WHERE s.registration_id = r.id
  AND r.status = 'registration_pending';

-- ---------- STAYS: no máximo 1 estadia válida por cadastro ----------
-- Duplicatas antigas (clique duplo) são marcadas como 'cancelled', nunca apagadas.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY registration_id ORDER BY created_at) AS rn
  FROM stays WHERE status <> 'cancelled'
)
UPDATE stays SET status = 'cancelled'
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

CREATE UNIQUE INDEX IF NOT EXISTS uq_stays_registration_valid
  ON stays(registration_id) WHERE status <> 'cancelled';

-- ---------- MESSAGES: campos do motor de envio ----------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS registration_id UUID REFERENCES registrations(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS failure_code TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS trigger_source TEXT; -- auto | manual | test
ALTER TABLE messages ADD COLUMN IF NOT EXISTS triggered_by UUID REFERENCES users(id);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS params JSONB;

CREATE INDEX IF NOT EXISTS idx_messages_wamid ON messages(whatsapp_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_registration ON messages(registration_id);
CREATE INDEX IF NOT EXISTS idx_messages_guest ON messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(hotel_id, created_at);

-- Vincula mensagens de boas-vindas antigas ao cadastro (idempotency_key = welcome-<registration_id>)
UPDATE messages
SET registration_id = substring(idempotency_key FROM 9)::uuid
WHERE registration_id IS NULL
  AND automation_type = 'welcome'
  AND idempotency_key ~ '^welcome-[0-9a-f-]{36}$';

-- Mensagens antigas com tipo antigo de pesquisa → tipo atual
UPDATE messages SET automation_type = 'checkout_survey' WHERE automation_type = 'satisfaction_survey';

-- ---------- AUTOMATION SETTINGS (por hotel) ----------
CREATE TABLE IF NOT EXISTS automation_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  automation_type TEXT NOT NULL, -- welcome | checkin_info | during_stay | checkout_survey
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hotel_id, automation_type)
);

-- ---------- MESSAGE TEMPLATES: campos extras ----------
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS automation_type TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS variables JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;
ALTER TABLE message_templates ADD COLUMN IF NOT EXISTS draft_text TEXT; -- edição ainda não enviada à Meta

-- ---------- WHATSAPP ACCOUNTS: campos extras ----------
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS connection_method TEXT; -- embedded_signup | manual
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS quality_rating TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE whatsapp_accounts ADD COLUMN IF NOT EXISTS last_checked_at TIMESTAMPTZ;

-- ---------- WHATSAPP EVENTS (logs técnicos) ----------
CREATE TABLE IF NOT EXISTS whatsapp_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hotel_id UUID REFERENCES hotels(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,          -- send | webhook_status | webhook_inbound | connect | template | error | dispatch
  level TEXT NOT NULL DEFAULT 'info', -- info | warn | error
  summary TEXT NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_events_hotel ON whatsapp_events(hotel_id, created_at DESC);

-- ---------- SATISFAÇÃO: 1 resposta por estadia ----------
CREATE UNIQUE INDEX IF NOT EXISTS uq_satisfaction_stay ON satisfaction_responses(stay_id);

-- ---------- CONFIG INTERNA (somente service role) ----------
CREATE TABLE IF NOT EXISTS internal_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO internal_config (key, value)
VALUES ('cron_secret', encode(gen_random_bytes(24), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- ---------- RLS ----------
ALTER TABLE automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_link_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_config ENABLE ROW LEVEL SECURITY; -- sem policies: só service role

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='automation_settings' AND policyname='Members view automation settings') THEN
    CREATE POLICY "Members view automation settings" ON automation_settings FOR SELECT
      USING (hotel_id IN (SELECT get_user_hotel_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='message_templates' AND policyname='Members view templates') THEN
    CREATE POLICY "Members view templates" ON message_templates FOR SELECT
      USING (hotel_id IN (SELECT get_user_hotel_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='whatsapp_events' AND policyname='Members view wa events') THEN
    CREATE POLICY "Members view wa events" ON whatsapp_events FOR SELECT
      USING (hotel_id IN (SELECT get_user_hotel_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='review_link_clicks' AND policyname='Members view review clicks') THEN
    CREATE POLICY "Members view review clicks" ON review_link_clicks FOR SELECT
      USING (hotel_id IN (SELECT get_user_hotel_ids()));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='click_events' AND policyname='Members view click events') THEN
    CREATE POLICY "Members view click events" ON click_events FOR SELECT
      USING (hotel_id IN (SELECT get_user_hotel_ids()));
  END IF;
  -- whatsapp_accounts: sem policy de SELECT para o navegador (token criptografado fica só no servidor)
END $$;

-- updated_at triggers nas novas tabelas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at' AND tgrelid = 'automation_settings'::regclass) THEN
    CREATE TRIGGER set_updated_at BEFORE UPDATE ON automation_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;

-- ---------- REALTIME: mensagens também atualizam o painel ----------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  END IF;
END $$;
