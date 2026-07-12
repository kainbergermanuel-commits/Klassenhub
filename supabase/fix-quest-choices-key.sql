-- ============================================================
-- KlassenHub · Fix: quest_choices von quests.id entkoppeln
-- ------------------------------------------------------------
-- feature-quests.sql band quest_choices per FK an quests.id. Das
-- funktioniert nur, wenn für die Woche eine quests-Zeile existiert —
-- die gibt es aber bewusst NUR bei Lehrer-Override, nicht bei der
-- automatischen Standardauswahl (siehe lib/quests.ts,
-- resolveWeeklyTemplateKeys). Ohne diesen Fix könnten Schüler bei
-- automatisch gewählten Wahlpfad-Quests nie eine Wahl speichern.
--
-- Neue Identität: (class_id, template_key, week_start, student_id) statt
-- quest_id — dadurch unabhängig davon, ob eine quests-Zeile existiert.
-- quest_choices ist brandneu und ungenutzt, daher sicheres drop+recreate
-- statt ALTER-Gymnastik. Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

drop table if exists public.quest_choices;

create table public.quest_choices (
  class_id     uuid not null references public.classes(id) on delete cascade,
  template_key text not null,
  week_start   date not null,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  choice_key   text not null,
  chosen_at    timestamptz not null default now(),
  primary key (class_id, template_key, week_start, student_id)
);

alter table public.quest_choices enable row level security;

-- Schüler liest/schreibt die eigene Wahl (nur innerhalb der eigenen Klasse)
drop policy if exists "quest_choices_own" on public.quest_choices;
create policy "quest_choices_own" on public.quest_choices
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and class_id in (select public.my_class_ids())
  );

-- Lehrer liest alle Wahlen der eigenen Klasse(n)
drop policy if exists "quest_choices_teacher_read" on public.quest_choices;
create policy "quest_choices_teacher_read" on public.quest_choices
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and class_id in (select public.my_class_ids())
  );

drop policy if exists "quest_choices_admin_all" on public.quest_choices;
create policy "quest_choices_admin_all" on public.quest_choices
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
