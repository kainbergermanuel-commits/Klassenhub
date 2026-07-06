-- ============================================================
-- KlassenHub · Wochen-To-Do-System entfernen
-- ------------------------------------------------------------
-- Das Feature wurde am 2026-07-04 komplett aus der App entfernt
-- (nicht genutzt, Testphase). Löscht die zugehörigen Tabellen samt
-- Policies/Daten. cascade entfernt todo_completions-FK automatisch,
-- Reihenfolge hier trotzdem explizit.
-- Wiederherstellung (Notfall): supabase/add-tables.sql erneut ausführen.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

drop table if exists public.todo_completions cascade;
drop table if exists public.todos cascade;
