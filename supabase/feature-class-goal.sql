-- ============================================================
-- KlassenHub · Klassenziel (Streaks-Phase 1: Kooperation)
-- ------------------------------------------------------------
-- Ein monatliches Kollektiv-Ziel je Klasse ("Season" = 'YYYY-MM').
-- Der Lehrer legt Zielwert + optionale Belohnung fest, alle Rollen
-- der Klasse können das aktuelle Ziel lesen.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.class_goals (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  season     text not null,                    -- 'YYYY-MM'
  target     int  not null check (target > 0),
  reward     text,
  updated_by uuid references public.profiles(id),
  updated_at timestamptz not null default now(),
  unique (class_id, season)
);

alter table public.class_goals enable row level security;

-- Alle Rollen der Klasse lesen das Ziel
drop policy if exists "class_goals_class_read" on public.class_goals;
create policy "class_goals_class_read" on public.class_goals
  for select to authenticated
  using (class_id in (select public.my_class_ids()));

-- Nur Lehrpersonen der eigenen Klasse(n) setzen/ändern das Ziel
drop policy if exists "class_goals_teacher_write" on public.class_goals;
create policy "class_goals_teacher_write" on public.class_goals
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "class_goals_admin_all" on public.class_goals;
create policy "class_goals_admin_all" on public.class_goals
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
