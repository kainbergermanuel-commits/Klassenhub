-- ============================================================
-- KlassenHub · Push-Zeitpunkt des Standard-Stundenplans (Lehrer-Feature)
-- ------------------------------------------------------------
-- Merkt sich pro Klasse, wann die Lehrperson den Standard-Stundenplan zuletzt
-- an die Kinder gesendet hat — für ein "Zuletzt gesendet: …" unter dem Push-
-- Button (Vertrauen/Klarheit, Prinzip 5). Eine Zeile pro Klasse (upsert).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.class_timetable_pushes (
  class_id   uuid primary key references public.classes(id) on delete cascade,
  pushed_at  timestamptz not null default now(),
  pushed_by  uuid references public.profiles(id)
);

alter table public.class_timetable_pushes enable row level security;

-- Lehrperson der Klasse: lesen + schreiben (Push protokollieren).
drop policy if exists "class_timetable_pushes_teacher" on public.class_timetable_pushes;
create policy "class_timetable_pushes_teacher" on public.class_timetable_pushes
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "class_timetable_pushes_admin_all" on public.class_timetable_pushes;
create policy "class_timetable_pushes_admin_all" on public.class_timetable_pushes
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
