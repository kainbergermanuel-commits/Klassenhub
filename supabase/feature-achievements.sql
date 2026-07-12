-- ============================================================
-- KlassenHub · Erfolge (Achievements) fürs Heldenbuch
-- ------------------------------------------------------------
-- Reines Log: hält fest, DASS eine Quest/Gilden-Quest/ein Klassenziel
-- irgendwann erledigt wurde, damit sich das als Statistik im Heldenbuch
-- niederschlägt. Bewusst getrennt von der eigentlichen Quest-Logik
-- (lib/quests.ts, lib/guilds.ts), die weiterhin NICHTS persistiert und
-- jede Woche neu berechnet — dieser Log ist reine Bonus-Statistik, kein
-- Ersatz für die Berechnung. Idempotent (Primary Key verhindert Duplikate).
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.achievements (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('quest', 'guild_quest', 'class_goal')),
  key         text not null,   -- template_key (quest/guild_quest) oder 'season_goal' (class_goal)
  period      text not null,   -- week_start 'YYYY-MM-DD' (quest/guild_quest) oder season 'YYYY-MM' (class_goal)
  achieved_at timestamptz not null default now(),
  primary key (student_id, kind, key, period)
);

create index if not exists achievements_student_idx on public.achievements (student_id);

alter table public.achievements enable row level security;

-- Schüler liest/schreibt die eigenen Erfolge
drop policy if exists "achievements_own" on public.achievements;
create policy "achievements_own" on public.achievements
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- Lehrer liest Erfolge der eigenen Klasse(n)
drop policy if exists "achievements_teacher_read" on public.achievements;
create policy "achievements_teacher_read" on public.achievements
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.profiles s where s.id = student_id and s.class_id in (select public.my_class_ids()))
  );

drop policy if exists "achievements_admin_all" on public.achievements;
create policy "achievements_admin_all" on public.achievements
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
