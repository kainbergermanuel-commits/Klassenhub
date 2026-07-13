-- ============================================================
-- KlassenHub · Dienst-Selbstbestätigung (pro Wochentag)
-- ------------------------------------------------------------
-- Schließt die ehrliche Datenlücke aus dem Gamification-Plan: `duties`
-- speichert nur die ZUTEILUNG (wer ist dran), kein "erledigt"-Feld. Ein
-- Wochendienst (z.B. "Tafel wischen") wird täglich ausgeführt — deshalb wird
-- die Erledigung PRO WOCHENTAG festgehalten (weekday 1=Mo … 5=Fr). Das Kind
-- kontrolliert sich selbst (SDT-Autonomie), kein Lehrer-Haken.
-- Idempotent. Im Supabase SQL-Editor ausführen.
--
-- ⚠️ Falls eine frühere (wochenweise, ohne weekday) Version dieser Tabelle
-- bereits angelegt wurde: das folgende DROP ist gefahrlos — die Tabelle ist
-- brandneu und wurde noch nicht produktiv befüllt.
-- ============================================================

drop table if exists public.duty_completions cascade;

create table if not exists public.duty_completions (
  duty_id      uuid not null references public.duties(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  weekday      smallint not null check (weekday between 1 and 5), -- 1=Mo … 5=Fr
  completed_at timestamptz not null default now(),
  primary key (duty_id, student_id, weekday)
);

create index if not exists duty_completions_student_idx on public.duty_completions (student_id);

alter table public.duty_completions enable row level security;

-- Schüler bestätigt/entfernt die eigene Erledigung — nur für Dienste, denen
-- er/sie auch zugeteilt ist.
drop policy if exists "duty_completions_own" on public.duty_completions;
create policy "duty_completions_own" on public.duty_completions
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.duties d where d.id = duty_id and auth.uid() = any(d.assignee_ids))
  );

-- Lehrer liest Bestätigungen der eigenen Klasse(n)
drop policy if exists "duty_completions_teacher_read" on public.duty_completions;
create policy "duty_completions_teacher_read" on public.duty_completions
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.duties d where d.id = duty_id and d.class_id in (select public.my_class_ids()))
  );

drop policy if exists "duty_completions_admin_all" on public.duty_completions;
create policy "duty_completions_admin_all" on public.duty_completions
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
