-- ============================================================
-- KlassenHub - Gangaufsichten der Lehrperson
-- ------------------------------------------------------------
-- Dieselbe Achse wie public.teacher_timetable_entries (add-teacher-
-- timetable.sql): die persoenliche Woche EINER Lehrperson, quer ueber alle
-- Klassen - nicht klassen-gescoped, gehoert nur ihr, geht an niemanden raus.
--
-- Eine Aufsicht findet in einer PAUSE statt, adressiert ueber break_slot:
--   break_slot 0  =  7:45-8:00   (vor der 1. Stunde, lange Aufsicht)
--   break_slot N  =  Pause nach der N. Stunde (vor Stunde N+1)
-- Zeit + Laenge (lang/kurz) werden clientseitig aus dem break_slot berechnet
-- (siehe lib/supervisionSlots.ts) und nicht gespeichert - sie haengen nur am
-- fixen Stundenraster, nicht an den Daten.
--
-- location ist optionaler Freitext (z.B. "Gang EG") fuer eine spaetere
-- Anzeige; die aktuelle Verwaltung setzt ihn noch nicht, die Spalte ist Vorrat.
--
-- Idempotent. Im Supabase SQL-Editor ausfuehren.
-- ============================================================

create table if not exists public.teacher_supervisions (
  id          uuid primary key default gen_random_uuid(),
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  day         smallint not null check (day between 1 and 5),        -- 1=Mo .. 5=Fr
  break_slot  smallint not null check (break_slot between 0 and 10),
  location    text not null default '',
  updated_at  timestamptz not null default now(),
  unique (teacher_id, day, break_slot)
);

alter table public.teacher_supervisions enable row level security;

-- Lehrperson: ausschliesslich die eigenen Zeilen, lesen + schreiben.
drop policy if exists "teacher_supervisions_own" on public.teacher_supervisions;
create policy "teacher_supervisions_own" on public.teacher_supervisions
  for all to authenticated
  using (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "teacher_supervisions_admin_all" on public.teacher_supervisions;
create policy "teacher_supervisions_admin_all" on public.teacher_supervisions
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
