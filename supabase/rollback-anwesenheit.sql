-- ============================================================
-- KlassenHub · Rollback: Anwesenheit
-- ------------------------------------------------------------
-- Entfernt das Anwesenheits-Feature vollständig (Tabelle inkl.
-- aller Policies und Daten). Im Supabase SQL-Editor ausführen.
-- ============================================================

drop table if exists public.attendance cascade;
