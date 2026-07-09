-- ============================================================
-- KlassenHub · Persönliche Termine
-- ------------------------------------------------------------
-- Gezielte Termine: NULL = an alle (Klassentermin), Array = nur
-- diese Schüler:innen (persönlicher Termin, z.B. Referat).
-- Gleiches Muster wie add-reminder-targets.sql.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: siehe unten (auskommentiert)
-- ============================================================

alter table public.events
  add column if not exists target_student_ids uuid[];

-- events_read: Lehrer sehen alle ihrer Klasse; Schüler/Eltern nur wenn target NULL oder sie/ihr Kind selbst drin sind
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events
  for select to authenticated
  using (
    class_id in (select public.my_class_ids())
    and (
      -- Lehrer sehen immer alle
      exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      -- Schüler: kein Target (alle) oder eigene ID im Array
      or (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'student')
        and (target_student_ids is null or auth.uid() = any(target_student_ids))
      )
      -- Elternteil: kein Target oder Kind im Array
      or (
        exists (select 1 from public.profiles where id = auth.uid() and role = 'parent')
        and (
          target_student_ids is null
          or exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'parent'
            and child_id = any(target_student_ids)
          )
        )
      )
    )
  );

-- Rollback:
-- drop policy if exists "events_read" on public.events;
-- create policy "events_read" on public.events
--   for select to authenticated
--   using (class_id in (select public.my_class_ids()));
-- alter table public.events drop column if exists target_student_ids;
