-- ============================================================
-- KlassenHub · Interaktive Rätsel-Quests (Gamification)
-- ------------------------------------------------------------
-- Wie der Quest-VORRAT (lib/questVault.ts) lebt auch der Rätsel-INHALT
-- (Frage, Optionen, Auflösung) bewusst als Code (lib/riddles.ts), die
-- richtige Antwort server-only (lib/riddles.server.ts). Diese Migration
-- speichert NUR den Gelöst-Zustand pro Kind — nach demselben Muster wie
-- quest_choices (siehe fix-quest-choices-key.sql).
--
-- `scope` trennt die Kadenzen (Design "beides je nach Rätselart"):
--   ''            = standalone/dauerhaft (Arc-Item einmal lösen, bleibt gelöst;
--                   Splitter-Rätsel später) — der Normalfall.
--   '<week_start>'= wochengebundene Rätsel-Quest (falls später gebraucht),
--                   analog zu quest_choices.week_start.
-- Dadurch ein Datenmodell für beide Rhythmen. Idempotent, im SQL-Editor
-- ausführen.
-- ============================================================

create table if not exists public.quest_riddle_solutions (
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  riddle_key text not null,              -- Schlüssel in lib/riddles.ts, keine FK
  scope      text not null default '',   -- '' = dauerhaft, sonst week_start-ISO
  solved_at  timestamptz not null default now(),
  attempts   int not null default 1,     -- nur Analytik, NIE kompetitiv angezeigt
  primary key (class_id, student_id, riddle_key, scope)
);

create index if not exists quest_riddle_solutions_student_idx
  on public.quest_riddle_solutions (student_id);

alter table public.quest_riddle_solutions enable row level security;

-- Schüler liest/schreibt die eigene Lösung (nur innerhalb der eigenen Klasse)
drop policy if exists "quest_riddle_solutions_own" on public.quest_riddle_solutions;
create policy "quest_riddle_solutions_own" on public.quest_riddle_solutions
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and class_id in (select public.my_class_ids())
  );

-- Lehrer liest alle Lösungen der eigenen Klasse(n) — schlichte gelöst/offen-Info,
-- keine Gamifizierung der Lehreransicht (Prinzip 5).
drop policy if exists "quest_riddle_solutions_teacher_read" on public.quest_riddle_solutions;
create policy "quest_riddle_solutions_teacher_read" on public.quest_riddle_solutions
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and class_id in (select public.my_class_ids())
  );

drop policy if exists "quest_riddle_solutions_admin_all" on public.quest_riddle_solutions;
create policy "quest_riddle_solutions_admin_all" on public.quest_riddle_solutions
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
