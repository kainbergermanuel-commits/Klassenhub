-- ============================================================
-- KlassenHub · Supabase Schema + RLS + Seed
-- Ausführen im Supabase SQL Editor
-- ============================================================

-- ---- TABLES ------------------------------------------------

create table if not exists public.classes (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  school text not null
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         text not null check (role in ('teacher', 'parent', 'student')),
  full_name    text not null,
  class_id     uuid references public.classes(id),
  avatar_color text not null default '#0F8A82'
);

create table if not exists public.homework (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  subject        text not null,
  subject_short  text not null,
  subject_color  text not null,
  title          text not null,
  due_date       date not null,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now(),
  attachment_name text
);

create table if not exists public.homework_completions (
  homework_id  uuid not null references public.homework(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);

-- ---- AUTO-CREATE PROFILE ON SIGNUP -------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Profile is created manually by the teacher (or via seed below).
  -- This trigger just ensures a minimal profile row exists.
  insert into public.profiles (id, role, full_name)
  values (new.id, 'student', coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---- ROW LEVEL SECURITY ------------------------------------

alter table public.classes              enable row level security;
alter table public.profiles             enable row level security;
alter table public.homework             enable row level security;
alter table public.homework_completions enable row level security;

-- classes: all authenticated users can read
create policy "classes_read" on public.classes
  for select to authenticated using (true);

-- profiles: read own profile + all profiles in same class
create policy "profiles_read_own" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or class_id = (select class_id from public.profiles where id = auth.uid())
  );

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- homework: all class members can read
create policy "homework_read" on public.homework
  for select to authenticated
  using (
    class_id = (select class_id from public.profiles where id = auth.uid())
  );

-- homework: only teachers can insert/update/delete
create policy "homework_teacher_write" on public.homework
  for all to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher' and class_id = public.homework.class_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'teacher' and class_id = public.homework.class_id
    )
  );

-- homework_completions: students write own; all class members read
create policy "completions_read" on public.homework_completions
  for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'parent')
      and class_id = (select class_id from public.profiles where id = public.homework_completions.student_id)
    )
  );

create policy "completions_student_write" on public.homework_completions
  for all to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());


-- ============================================================
-- SEED DATA (Demo: Klasse 4a, MS Hirtenberg)
-- Führe diesen Block aus NACHDEM du die Auth-User angelegt hast.
-- ============================================================

-- 1. Klasse anlegen
insert into public.classes (id, name, school) values
  ('00000000-0000-0000-0000-000000000001', '4a', 'MS Hirtenberg')
on conflict (id) do nothing;

-- 2. Nach dem Anlegen der Supabase Auth-User:
--    UPDATE public.profiles SET role='teacher', full_name='Hr. Berger', class_id='00000000-0000-0000-0000-000000000001', avatar_color='#0F8A82' WHERE id='<UUID des teacher-users>';
--    UPDATE public.profiles SET role='student', full_name='Lena Hofer',  class_id='00000000-0000-0000-0000-000000000001', avatar_color='#0F8A82' WHERE id='<UUID des student-users>';
--    UPDATE public.profiles SET role='parent',  full_name='Fam. Hofer',  class_id='00000000-0000-0000-0000-000000000001', avatar_color='#C98A2B' WHERE id='<UUID des parent-users>';

-- 3. Demo-Hausübungen
insert into public.homework (class_id, subject, subject_short, subject_color, title, due_date) values
  ('00000000-0000-0000-0000-000000000001', 'Mathematik', 'M',    '#0F8A82', 'Übungsblatt S. 42, Nr. 1–6',      current_date),
  ('00000000-0000-0000-0000-000000000001', 'Deutsch',    'D',    '#B0413E', 'Leseprobe Kapitel 4 vorbereiten', current_date),
  ('00000000-0000-0000-0000-000000000001', 'Englisch',   'E',    '#2F6DB0', 'Vocabulary Unit 7 lernen',        current_date + 1),
  ('00000000-0000-0000-0000-000000000001', 'NaWi',       'NaWi', '#3E9E6B', 'Protokoll Versuch 3',             current_date - 3)
on conflict do nothing;
