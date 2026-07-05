-- ============================================================
-- KlassenHub · Rollback Mitteilungsheft-Bestätigung
-- ============================================================
alter table public.messages
  drop column if exists requires_ack,
  drop column if exists acknowledged_at;
