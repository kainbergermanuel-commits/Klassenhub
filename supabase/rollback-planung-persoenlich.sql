-- ============================================================
-- KlassenHub · Rollback: Planung wieder an der Klasse
-- ------------------------------------------------------------
-- ACHTUNG: Die Klassenzuordnung der Notizen ist beim Vorwärtsschritt
-- entfallen und lässt sich hier nicht wiederherstellen. Dieser Rückbau
-- stellt die STRUKTUR wieder her; die Notizen bekommen die Klasse, die
-- unten eingetragen wird (Platzhalter anpassen!), sonst bleibt sie leer
-- und die alte Policy zeigt niemandem etwas.
-- ============================================================

alter table public.planning_notes
  add column if not exists class_id uuid references public.classes(id) on delete cascade;

-- Klassen nachtragen, sonst sieht niemand seine Notizen:
-- update public.planning_notes set class_id = '<KLASSEN-UUID>' where class_id is null;

drop index if exists public.planning_notes_author_key;
drop index if exists public.planning_notes_author_week_idx;

create index if not exists planning_notes_class_week_idx
  on public.planning_notes (class_id, week_start);

alter table public.planning_notes
  add constraint planning_notes_class_id_week_start_day_subject_key
  unique (class_id, week_start, day, subject);

drop policy if exists "planning_own_all" on public.planning_notes;
create policy "planning_teacher_all" on public.planning_notes
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
