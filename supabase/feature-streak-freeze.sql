-- ============================================================
-- KlassenHub · Streak-Joker (Streak-Freeze)
-- ------------------------------------------------------------
-- Ein Schüler kann pro Season (Kalendermonat) einmal einen "Joker"
-- einsetzen: die eine verpasste Hausübung, an der der Streak reißt,
-- wird überbrückt (zählt nicht mit, bricht den Streak aber nicht).
-- Season-Limit (1/Monat) wird in der Server-Action geprüft, nicht
-- per RLS. Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.streak_freezes (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  homework_id uuid not null references public.homework(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (student_id, homework_id)
);

create index if not exists streak_freezes_student_idx on public.streak_freezes (student_id);

alter table public.streak_freezes enable row level security;

-- Schüler liest/schreibt eigene Freezes (nur für HÜ der eigenen Klasse)
drop policy if exists "streak_freezes_own" on public.streak_freezes;
create policy "streak_freezes_own" on public.streak_freezes
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.homework h
      join public.profiles p on p.id = auth.uid()
      where h.id = homework_id and h.class_id = p.class_id
    )
  );

-- Lehrer liest Freezes der eigenen Klasse(n)
drop policy if exists "streak_freezes_teacher_read" on public.streak_freezes;
create policy "streak_freezes_teacher_read" on public.streak_freezes
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.profiles s where s.id = student_id and s.class_id in (select public.my_class_ids()))
  );

drop policy if exists "streak_freezes_admin_all" on public.streak_freezes;
create policy "streak_freezes_admin_all" on public.streak_freezes
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
