-- ============================================================
-- KlassenHub · Anwesenheit (An-/Abwesenheit pro Tag)
-- ------------------------------------------------------------
-- Nur ABWEICHUNGEN werden gespeichert: kein Eintrag = anwesend.
-- Max. ein Eintrag pro (Schüler:in, Tag).
--   status:    'entschuldigt' | 'unentschuldigt'  (bewusst KEIN
--              "krank" — Gesundheitsdaten, DSGVO Art. 9)
--   source:    'teacher' = von Lehrperson erfasst (sofort bestätigt)
--              'parent'  = Elternmeldung, bis zur Bestätigung offen
--   confirmed_by/At: leer = offene Elternmeldung
-- Rollen: Lehrperson volle Rechte (eigene Klassen), Elternteil
-- liest/meldet nur das eigene Kind, Schüler:in liest nur sich selbst.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-anwesenheit.sql
-- ============================================================

create table if not exists public.attendance (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  date         date not null,
  status       text not null default 'entschuldigt' check (
    status in ('entschuldigt', 'unentschuldigt')
  ),
  note         text not null default '',
  source       text not null default 'teacher' check (source in ('teacher', 'parent')),
  reported_by  uuid not null references public.profiles(id) on delete cascade,
  confirmed_by uuid references public.profiles(id) on delete set null,
  confirmed_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (student_id, date)
);

create index if not exists attendance_class_date_idx
  on public.attendance (class_id, date);

alter table public.attendance enable row level security;

-- Lehrpersonen der eigenen Klasse(n): volle Rechte
drop policy if exists "attendance_teacher_all" on public.attendance;
create policy "attendance_teacher_all" on public.attendance
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

-- Schüler:in: nur die eigenen Einträge lesen
drop policy if exists "attendance_student_read" on public.attendance;
create policy "attendance_student_read" on public.attendance
  for select to authenticated
  using (student_id = auth.uid());

-- Elternteil: Einträge des eigenen Kindes lesen
drop policy if exists "attendance_parent_read" on public.attendance;
create policy "attendance_parent_read" on public.attendance
  for select to authenticated
  using (
    student_id = (select child_id from public.profiles where id = auth.uid())
  );

-- Elternteil: Abmeldung für das eigene Kind anlegen.
-- Erzwungen: source='parent', unbestätigt, status 'entschuldigt',
-- reported_by = man selbst, Kind = das verknüpfte Kind.
drop policy if exists "attendance_parent_insert" on public.attendance;
create policy "attendance_parent_insert" on public.attendance
  for insert to authenticated
  with check (
    source = 'parent'
    and status = 'entschuldigt'
    and confirmed_by is null
    and confirmed_at is null
    and reported_by = auth.uid()
    and student_id = (select child_id from public.profiles where id = auth.uid())
    and class_id in (select public.my_class_ids())
  );

-- Elternteil: eigene, noch unbestätigte Meldungen zurückziehen
drop policy if exists "attendance_parent_delete" on public.attendance;
create policy "attendance_parent_delete" on public.attendance
  for delete to authenticated
  using (
    source = 'parent'
    and reported_by = auth.uid()
    and confirmed_at is null
  );

-- Admin: alles
drop policy if exists "attendance_admin_all" on public.attendance;
create policy "attendance_admin_all" on public.attendance
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
