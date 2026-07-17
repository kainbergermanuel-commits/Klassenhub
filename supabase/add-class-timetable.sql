-- ============================================================
-- KlassenHub · Standard-Stundenplan der Klasse (Lehrer-Feature)
-- ------------------------------------------------------------
-- Bisher füllte jedes Kind seinen Stundenplan nur selbst aus
-- (public.timetable_entries, siehe add-timetable.sql). Neu: die
-- Lehrperson pflegt EINEN Klassen-Standardplan (diese Tabelle) und kann
-- ihn per Knopfdruck an alle Kinder der Klasse "pushen" — das kopiert die
-- Zeilen in die persönlichen timetable_entries jedes Kindes.
--
-- Manuels Entscheidung: Push überschreibt bestehende Einträge des Kindes
-- vollständig (kein Merge); Kinder/Eltern können danach wie bisher selbst
-- weiter bearbeiten (kein Entzug des Schüler-Schreibrechts).
--
-- Zweite Ergänzung hier: eine neue RLS-Policy auf der BESTEHENDEN
-- timetable_entries-Tabelle, die es Lehrpersonen erlaubt, im Namen der
-- Kinder ihrer Klasse zu schreiben (nötig für den Push selbst — vorher
-- durften dort nur Schüler:innen ihre eigenen Zeilen und Admins schreiben).
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.class_timetable_entries (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  day        smallint not null check (day between 1 and 5), -- 1=Mo … 5=Fr
  slot       smallint not null check (slot between 1 and 10),
  subject    text not null,
  updated_at timestamptz not null default now(),
  unique (class_id, day, slot)
);

alter table public.class_timetable_entries enable row level security;

-- Lehrperson der Klasse: lesen + bearbeiten
drop policy if exists "class_timetable_teacher" on public.class_timetable_entries;
create policy "class_timetable_teacher" on public.class_timetable_entries
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "class_timetable_admin_all" on public.class_timetable_entries;
create policy "class_timetable_admin_all" on public.class_timetable_entries
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- ─── Push-Berechtigung auf timetable_entries ────────────────────────────────
-- Lehrperson darf Zeilen von Kindern DER EIGENEN KLASSE schreiben (für den
-- Push-Vorgang: alte Zeilen löschen + neue aus dem Standardplan einfügen).
drop policy if exists "timetable_teacher_write_class" on public.timetable_entries;
create policy "timetable_teacher_write_class" on public.timetable_entries
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = timetable_entries.student_id
        and p.class_id in (select public.my_class_ids())
    )
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = timetable_entries.student_id
        and p.class_id in (select public.my_class_ids())
    )
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
