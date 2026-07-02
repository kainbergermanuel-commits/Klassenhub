-- ============================================================
-- KlassenHub · Planungs-Tool für Lehrpersonen
-- ------------------------------------------------------------
-- Notizen für Wochen- und Tagesplanung, allgemein oder je Fach.
-- Eine Notiz pro (Klasse, Woche, Tag, Fach):
--   day = 0  → Wochennotiz, day 1–5 → Mo–Fr
--   subject = '' → allgemein, sonst Fachname (lib/subjects.ts)
-- Sichtbar/bearbeitbar NUR für Lehrpersonen der Klasse (+ Admin).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-planung.sql
-- ============================================================

create table if not exists public.planning_notes (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,                    -- Montag der Woche (YYYY-MM-DD)
  day        smallint not null default 0 check (day between 0 and 5),
  subject    text not null default '',
  content    text not null default '',
  updated_at timestamptz not null default now(),
  unique (class_id, week_start, day, subject)
);

create index if not exists planning_notes_class_week_idx
  on public.planning_notes (class_id, week_start);

alter table public.planning_notes enable row level security;

-- Nur Lehrpersonen der eigenen Klasse(n)
drop policy if exists "planning_teacher_all" on public.planning_notes;
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

drop policy if exists "planning_admin_all" on public.planning_notes;
create policy "planning_admin_all" on public.planning_notes
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
