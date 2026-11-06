-- ============================================================
-- ClassHaven · Rollback: Elternnachricht gezielt an eine Lehrperson
-- ------------------------------------------------------------
-- Erst den Code zurücksetzen (git checkout stand-2026-11-06), dann
-- dieses Skript. Umgekehrt schickte die App eine Spalte, die es nicht
-- mehr gibt, und das Senden schlüge fehl.
-- ============================================================
drop trigger if exists messages_addressed_guard on public.messages;
drop function if exists public.messages_addressed_guard();
drop index if exists public.messages_addressed_idx;
alter table public.messages
  drop column if exists addressed_teacher_id;
