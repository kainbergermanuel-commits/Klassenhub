-- ============================================================
-- KlassenHub · Zeitkristall (HÜ-Fristverlängerung)
-- ------------------------------------------------------------
-- Balance-Fahrplan Phase 3: ein Werkzeug-Item (kein Abzeichen) — das Kind
-- setzt es aktiv ein und verlängert damit persönlich die Frist EINER
-- Hausübung um ein paar Tage, ohne dass die Streak deswegen reißt. 1x pro
-- Season, analog zum Schutzschild-Joker (streak_freezes), aber als echtes
-- Werkzeug statt Puffer: die HÜ bleibt real offen, die Verlängerung ist für
-- die Lehrkraft sichtbar (Transparenz, Prinzip 5), keine versteckte Ausnahme.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.homework_extensions (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  homework_id  uuid not null references public.homework(id) on delete cascade,
  extra_days   smallint not null check (extra_days between 1 and 7),
  created_at   timestamptz not null default now(),
  primary key (student_id, homework_id)
);

create index if not exists homework_extensions_student_idx on public.homework_extensions (student_id);

alter table public.homework_extensions enable row level security;

-- Schüler:in legt die eigene Verlängerung an (Server-Action prüft das
-- 1x/Season-Limit application-seitig, analog useStreakFreeze.ts).
drop policy if exists "homework_extensions_own_insert" on public.homework_extensions;
create policy "homework_extensions_own_insert" on public.homework_extensions
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "homework_extensions_own_read" on public.homework_extensions;
create policy "homework_extensions_own_read" on public.homework_extensions
  for select to authenticated
  using (student_id = auth.uid());

-- Eltern lesen Verlängerungen ihres verknüpften Kindes (siehe profiles.child_id,
-- gleiches Muster wie add-hw-parent-confirmation.sql) — nötig, damit die
-- Meilenstein-Berechnung bei einer Eltern-Bestätigung (confirmHomeworkCompletion.ts)
-- eine per Zeitkristall überbrückte Lücke korrekt berücksichtigt.
drop policy if exists "homework_extensions_parent_read" on public.homework_extensions;
create policy "homework_extensions_parent_read" on public.homework_extensions
  for select to authenticated
  using (
    student_id = (select child_id from public.profiles where id = auth.uid() and role = 'parent')
  );

-- Lehrer liest Verlängerungen der eigenen Klasse(n) — Transparenz, Prinzip 5.
drop policy if exists "homework_extensions_teacher_read" on public.homework_extensions;
create policy "homework_extensions_teacher_read" on public.homework_extensions
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id in (select public.my_class_ids()))
  );

drop policy if exists "homework_extensions_admin_all" on public.homework_extensions;
create policy "homework_extensions_admin_all" on public.homework_extensions
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
