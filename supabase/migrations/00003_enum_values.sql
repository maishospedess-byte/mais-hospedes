-- ============================================================
-- 00003 — Novos valores de enum (rodar ANTES da 00004, em execução separada)
-- Postgres não permite usar um valor de enum recém-criado na mesma transação.
-- ============================================================

ALTER TYPE registration_status ADD VALUE IF NOT EXISTS 'registration_confirmed';
