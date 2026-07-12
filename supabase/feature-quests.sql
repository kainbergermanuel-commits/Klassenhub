-- ============================================================
-- KlassenHub · Quests (Gamification Phase 1)
-- ------------------------------------------------------------
-- Der Quest-VORRAT (Titel, Erzähltext, Ziel-Signal, Zielzahl) lebt bewusst
-- NICHT in der DB, sondern als Code in lib/questVault.ts — siehe
-- Umsetzungsplan "Vorrat als geseedete JSON im Code (Low-Effort)". Diese
-- Migration speichert nur, WELCHE Vorlage (template_key) für welche Klasse
-- in welcher Woche aktiv ist, und welchen Wahlpfad ein Schüler gewählt hat.
-- Quest-FORTSCHRITT wird nicht gespeichert, sondern zur Laufzeit aus
-- vorhandenen Tabellen berechnet (homework_completions, reminder_views,
-- events, duties, streak_confirmations …) — nach demselben Muster wie
-- computeStreak(). Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

-- 1) Aktive Quest-Instanzen je Klasse & Woche --------------------
create table if not exists public.quests (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  template_key text not null,   -- Schlüssel in lib/questVault.ts, keine FK
  week_start   date not null,   -- Montag der Woche, in der die Quest aktiv ist
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (class_id, template_key, week_start)
);

create index if not exists quests_class_week_idx on public.quests (class_id, week_start);

alter table public.quests enable row level security;

-- Alle Rollen der Klasse lesen die aktiven Quests
drop policy if exists "quests_class_read" on public.quests;
create policy "quests_class_read" on public.quests
  for select to authenticated
  using (class_id in (select public.my_class_ids()));

-- Nur Lehrpersonen der eigenen Klasse(n) kuratieren (tauschen/entfernen)
drop policy if exists "quests_teacher_write" on public.quests;
create policy "quests_teacher_write" on public.quests
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "quests_admin_all" on public.quests;
create policy "quests_admin_all" on public.quests
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ⚠️ quest_choices unten ist veraltet — siehe fix-quest-choices-key.sql,
-- das die Tabelle ohne FK auf quests.id neu aufsetzt (Grund dort erklärt).
-- 2) Gewählter Wahlpfad je Schüler (nur für choice_group-Quests) --
create table if not exists public.quest_choices (
  quest_id   uuid not null references public.quests(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  choice_key text not null,   -- z. B. 'chronist' | 'mentor', siehe lib/questVault.ts
  chosen_at  timestamptz not null default now(),
  primary key (quest_id, student_id)
);

alter table public.quest_choices enable row level security;

-- Schüler liest/schreibt die eigene Wahl (nur für Quests der eigenen Klasse)
drop policy if exists "quest_choices_own" on public.quest_choices;
create policy "quest_choices_own" on public.quest_choices
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.quests q
      join public.profiles p on p.id = auth.uid()
      where q.id = quest_id and q.class_id = p.class_id
    )
  );

-- Lehrer liest alle Wahlen der eigenen Klasse(n)
drop policy if exists "quest_choices_teacher_read" on public.quest_choices;
create policy "quest_choices_teacher_read" on public.quest_choices
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.quests q where q.id = quest_id and q.class_id in (select public.my_class_ids()))
  );

drop policy if exists "quest_choices_admin_all" on public.quest_choices;
create policy "quest_choices_admin_all" on public.quest_choices
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
