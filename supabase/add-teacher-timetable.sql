-- ============================================================
-- KlassenHub · Persönlicher Stundenplan der Lehrperson
-- ------------------------------------------------------------
-- Abgrenzung zu public.class_timetable_entries (add-class-timetable.sql):
-- jene Tabelle beschreibt den Plan EINER KLASSE (was 4a die ganze Woche hat,
-- inklusive Fächer, die andere Lehrpersonen unterrichten). Diese hier
-- beschreibt eine ANDERE ACHSE: die Woche EINER PERSON, quer über mehrere
-- Klassen. Deshalb eine eigene Tabelle statt einer Erweiterung — die beiden
-- lassen sich nicht sinnvoll ineinander abbilden.
--
-- Folge daraus: Diese Tabelle ist bewusst NICHT klassen-gescoped. Der Plan
-- ändert sich nicht, wenn die Lehrperson oben zwischen 4a und 1b umschaltet
-- — es ist ihre eigene Woche. Entsprechend ist die RLS hier einfacher als
-- überall sonst in der App: rein persönlich, kein my_class_ids()-Join.
--
-- class_label ist Manuels Entscheidung bewusst ein REINER FREITEXT ("4a"),
-- keine Verknüpfung auf public.classes. Eine echte Zuordnung wäre für den
-- Zweck (nachsehen, wann man in welcher Klasse sein muss) unnötiger Aufwand
-- und würde den Plan an Klassen binden, die es in der App evtl. gar nicht gibt
-- (Werkgruppen, Förderstunden, andere Schulstufen).
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.teacher_timetable_entries (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  day         smallint not null check (day between 1 and 5),  -- 1=Mo … 5=Fr
  slot        smallint not null check (slot between 1 and 10),
  subject     text not null,
  class_label text not null default '',
  updated_at  timestamptz not null default now(),
  unique (teacher_id, day, slot)
);

alter table public.teacher_timetable_entries enable row level security;

-- Lehrperson: ausschließlich die eigenen Zeilen, lesen + schreiben.
drop policy if exists "teacher_timetable_own" on public.teacher_timetable_entries;
create policy "teacher_timetable_own" on public.teacher_timetable_entries
  for all to authenticated
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teacher_timetable_admin_all" on public.teacher_timetable_entries;
create policy "teacher_timetable_admin_all" on public.teacher_timetable_entries
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
