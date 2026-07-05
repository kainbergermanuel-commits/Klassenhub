-- ============================================================
-- KlassenHub · Mitteilungsheft: Bestätigung ("Zur Kenntnis genommen")
-- ------------------------------------------------------------
-- Ergänzt Nachrichten um eine aktive Empfangsbestätigung, getrennt
-- vom automatischen Lesestatus (seen_at wird beim Öffnen gesetzt):
--   requires_ack    = Lehrkraft hat beim Anlegen "Bestätigung anfordern" aktiviert
--   acknowledged_at = Elternteil hat aktiv auf "Zur Kenntnis genommen" geklickt
--
-- Keine RLS-Änderung nötig: die bestehende messages_update-Policy
-- erlaubt dem Elternteil bereits das Aktualisieren von Nachrichten
-- im eigenen Heft (parent_id = auth.uid()) — wie schon bei seen_at.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-message-ack.sql
-- ============================================================

alter table public.messages
  add column if not exists requires_ack    boolean not null default false,
  add column if not exists acknowledged_at timestamptz;
