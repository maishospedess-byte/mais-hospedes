-- ============================================================
-- 00005 — Agendador persistente (funciona com o navegador fechado)
-- A cada 30 segundos o banco chama /api/cron/dispatch, que envia
-- as mensagens vencidas (ex.: boas-vindas 5 minutos após o cadastro).
-- O segredo fica em internal_config (sem acesso pelo navegador).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Remove agendamento anterior com o mesmo nome (idempotente)
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'mh-dispatch-messages';

SELECT cron.schedule(
  'mh-dispatch-messages',
  '30 seconds',
  $job$
  SELECT net.http_post(
    url := 'https://mais-hospedes.vercel.app/api/cron/dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.internal_config WHERE key = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $job$
);
