-- ============================================================
-- KlassenHub · Fächer-Katalog (Admin-verwaltet)
-- ------------------------------------------------------------
-- Bisher lebte die Fächerliste nur als hartkodiertes TS-Array
-- (lib/subjects.ts) — für den neuen Stundenplan-Baustein (Lehrer erstellt
-- einen Standard-Stundenplan, Admin verwaltet den Fächer-Katalog inkl.
-- Farbe) braucht es eine echte, editierbare Tabelle. Bewusst GLOBAL (nicht
-- pro Klasse/Schule) — das Admin-Panel verwaltet schon jetzt alle Klassen
-- schulübergreifend an einem Ort (siehe app/(app)/admin/page.tsx).
--
-- ⚠️ Scope bewusst eng gehalten: nur der neue Stundenplan-Baustein liest aus
-- dieser Tabelle. Die bestehende Hausübungs-Fächerauswahl (lib/subjects.ts,
-- TeacherSubjectsEditor) bleibt unangetastet — Vereinheitlichung wäre ein
-- separates, größeres Refactoring mit eigenem Blast-Radius.
--
-- Seed übernimmt die 13 Einträge aus lib/subjects.ts, damit der Katalog
-- beim ersten Laden nicht leer ist. Idempotent (unique auf short + on
-- conflict do nothing). Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.subjects (
  id         uuid primary key default gen_random_uuid(),
  label      text not null,
  short      text not null unique,
  color      text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.subjects enable row level security;

-- Alle angemeldeten Rollen lesen den Katalog (Stundenplan-Fächerauswahl
-- für Lehrer UND Schüler/Eltern).
drop policy if exists "subjects_read_all" on public.subjects;
create policy "subjects_read_all" on public.subjects
  for select to authenticated
  using (true);

-- Nur Admin verwaltet den Katalog (anlegen/ändern/entfernen).
drop policy if exists "subjects_admin_write" on public.subjects;
create policy "subjects_admin_write" on public.subjects
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

insert into public.subjects (label, short, color, sort_order) values
  ('Mathematik',            'M',      '#0F8A82', 0),
  ('Deutsch',               'D',      '#B0413E', 1),
  ('Englisch',              'E',      '#2F6DB0', 2),
  ('Biologie',              'BU',     '#10B981', 3),
  ('Geografie',             'GW',     '#C98A2B', 4),
  ('Geschichte',            'GS',     '#7B5EA7', 5),
  ('Physik',                'PH',     '#0369A1', 6),
  ('Chemie',                'CH',     '#9D174D', 7),
  ('Musik',                 'MU',     '#D44B9E', 8),
  ('Bew. & Sport',          'BSP',    '#E07B35', 9),
  ('Digitale Grundbildung', 'DGB',    '#6366F1', 10),
  ('Berufsorientierung',    'BO',     '#64748B', 11),
  ('Sonstiges',             'Sonst.', '#6E7E80', 12)
on conflict (short) do nothing;
