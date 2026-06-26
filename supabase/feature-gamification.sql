-- ============================================================
-- Feature-Migration: Avatare (gender), Streak-Bestätigung, Gesehen-Status
-- Im Supabase SQL-Editor ausführen. Idempotent, löscht keine Daten.
-- ============================================================

-- 1) Geschlecht für comic-Avatare ---------------------------
alter table public.profiles
  add column if not exists gender text check (gender in ('m', 'f'));

-- 2) Streak-Meilenstein-Bestätigungen -----------------------
create table if not exists public.streak_confirmations (
  student_id   uuid not null references public.profiles(id) on delete cascade,
  milestone    int  not null,
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz not null default now(),
  primary key (student_id, milestone)
);
alter table public.streak_confirmations enable row level security;

-- Schüler liest eigene
drop policy if exists "streak_own_read" on public.streak_confirmations;
create policy "streak_own_read" on public.streak_confirmations for select to authenticated
  using (student_id = auth.uid());

-- Lehrer liest Klasse
drop policy if exists "streak_teacher_read" on public.streak_confirmations;
create policy "streak_teacher_read" on public.streak_confirmations for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.profiles s where s.id = student_id and s.class_id = public.my_class_id())
  );

-- Elternteil liest + bestätigt für Kinder der eigenen Klasse
drop policy if exists "streak_parent_read" on public.streak_confirmations;
create policy "streak_parent_read" on public.streak_confirmations for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'parent'
        and p.class_id = (select class_id from public.profiles where id = student_id)
    )
  );
drop policy if exists "streak_parent_write" on public.streak_confirmations;
create policy "streak_parent_write" on public.streak_confirmations for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'parent'
        and p.class_id = (select class_id from public.profiles where id = student_id)
    )
  );

-- 3) "Gesehen"-Status für Erinnerungen ----------------------
create table if not exists public.reminder_views (
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  student_id  uuid not null references public.profiles(id) on delete cascade,
  seen_at     timestamptz not null default now(),
  primary key (reminder_id, student_id)
);
alter table public.reminder_views enable row level security;

-- Schüler schreibt/liest eigene (nur für Erinnerungen der eigenen Klasse)
drop policy if exists "reminder_views_own" on public.reminder_views;
create policy "reminder_views_own" on public.reminder_views for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.class_id = public.my_class_id())
  );

-- Lehrer liest alle der Klasse (um zu sehen, wer gesehen hat)
drop policy if exists "reminder_views_teacher_read" on public.reminder_views;
create policy "reminder_views_teacher_read" on public.reminder_views for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and exists (select 1 from public.reminders r where r.id = reminder_id and r.class_id = public.my_class_id())
  );

-- 4) Geschlechter für alle bekannten Nutzer --
update public.profiles set gender = 'm' where full_name in (
  'Jonas Gruber','Max Bauer','Felix Wagner','Lukas Fischer','Noah Weber','Ben Lehner','Tim Steiner','David Moser'
) and gender is null;
update public.profiles set gender = 'f' where full_name in (
  'Anna Schneider','Sophie Müller','Emma Koch','Mia Huber','Lea Pichler','Julia Maier','Lena Hofer'
) and gender is null;
-- Lehrer bekommt männlichen Avatar
update public.profiles set gender = 'm' where role = 'teacher' and gender is null;
