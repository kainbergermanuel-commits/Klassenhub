-- ============================================================
-- KlassenHub · Persönliche Termine von Schüler:innen
-- ------------------------------------------------------------
-- Schüler:innen dürfen eigene Termine anlegen/löschen — aber
-- NUR wenn sie selbst die Autor:in sind UND der Termin
-- ausschließlich an sie selbst gerichtet ist (kein Klassentermin,
-- kein Termin für andere). Klassentermine der Lehrperson bleiben
-- für Schüler:innen weiterhin nicht editierbar (created_by ≠ sie).
-- Setzt voraus: add-event-targets.sql ist bereits eingespielt.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: siehe unten (auskommentiert)
-- ============================================================

drop policy if exists "events_write_student" on public.events;
create policy "events_write_student" on public.events
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
  )
  with check (
    class_id in (select public.my_class_ids())
    and created_by = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
    and target_student_ids = array[auth.uid()]
  );

-- Rollback:
-- drop policy if exists "events_write_student" on public.events;
