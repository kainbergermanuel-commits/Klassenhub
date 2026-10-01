-- ============================================================
-- KlassenHub · Rollback Mitteilungsheft-Löschen
-- Achtung: gelöschte Nachrichten erscheinen danach als leere Blasen
-- (der Text ist bereits entfernt).
-- ============================================================
drop function if exists public.delete_own_message(uuid);
alter table public.messages
  drop column if exists deleted_at;
