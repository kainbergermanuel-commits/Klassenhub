-- ============================================================
-- KlassenHub · Botenfeder (Eltern-Erinnerung)
-- ------------------------------------------------------------
-- Balance-Fahrplan Phase 3: zweites Werkzeug-Item. Bewusst KEIN Freitext-
-- Messaging — ein kanonischer, vordefinierter Hinweis ("Dein Kind bittet um
-- Bestätigung von HÜ X"), maximal 1x/Tag. Hält die Datenschutz-/Zustimmungs-
-- Schwelle niedrig, ohne den eigentlichen Zweck (Eltern erinnern) zu verfehlen.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.parent_nudges (
  id           uuid primary key default gen_random_uuid(),
  student_id   uuid not null references public.profiles(id) on delete cascade,
  homework_id  uuid not null references public.homework(id) on delete cascade,
  created_at   timestamptz not null default now()
);

create index if not exists parent_nudges_student_idx on public.parent_nudges (student_id, created_at);

alter table public.parent_nudges enable row level security;

-- Schüler:in legt die eigene Erinnerung an (Server-Action prüft das
-- 1x/Tag-Limit application-seitig).
drop policy if exists "parent_nudges_own_insert" on public.parent_nudges;
create policy "parent_nudges_own_insert" on public.parent_nudges
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "parent_nudges_own_read" on public.parent_nudges;
create policy "parent_nudges_own_read" on public.parent_nudges
  for select to authenticated
  using (student_id = auth.uid());

-- Eltern lesen Erinnerungen ihres verknüpften Kindes (siehe profiles.child_id,
-- feature-parent-child-link.sql).
drop policy if exists "parent_nudges_parent_read" on public.parent_nudges;
create policy "parent_nudges_parent_read" on public.parent_nudges
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'parent' and child_id = parent_nudges.student_id)
  );

-- Lehrer liest Erinnerungen der eigenen Klasse(n) — Transparenz, Prinzip 5.
drop policy if exists "parent_nudges_teacher_read" on public.parent_nudges;
create policy "parent_nudges_teacher_read" on public.parent_nudges
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id in (select public.my_class_ids()))
  );

drop policy if exists "parent_nudges_admin_all" on public.parent_nudges;
create policy "parent_nudges_admin_all" on public.parent_nudges
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
