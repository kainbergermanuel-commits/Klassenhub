-- ============================================================
-- KlassenHub · KONSOLIDIERTES Schema + RLS (Stand: aktuell)
-- Einzige Quelle der Wahrheit. Idempotent: legt fehlende Tabellen an,
-- ersetzt Policies/Funktionen. Löscht KEINE Tabellen/Daten.
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

-- ---- TABLES ------------------------------------------------

create table if not exists public.classes (
  id     uuid primary key default gen_random_uuid(),
  name   text not null,
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
  id              uuid primary key default gen_random_uuid(),
  class_id        uuid not null references public.classes(id) on delete cascade,
  subject         text not null,
  subject_short   text not null,
  subject_color   text not null,
  title           text not null,
  due_date        date not null,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  attachment_name text
);

create table if not exists public.homework_completions (
  homework_id  uuid not null references public.homework(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);

create table if not exists public.todos (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  title      text not null,
  week_start date not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.todo_completions (
  todo_id      uuid not null references public.todos(id) on delete cascade,
  student_id   uuid not null references public.profiles(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (todo_id, student_id)
);

create table if not exists public.reminders (
  id             uuid primary key default gen_random_uuid(),
  class_id       uuid not null references public.classes(id) on delete cascade,
  title          text not null,
  description    text,
  event_date     date not null,
  event_time     text,
  event_end_time text,
  created_by     uuid references public.profiles(id),
  created_at     timestamptz not null default now()
);

create table if not exists public.duties (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  week_start   date not null,
  duty_name    text not null,
  assignee_ids uuid[] not null default '{}',
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  unique (class_id, week_start, duty_name)
);

-- ---- HELPER: eigene class_id ohne RLS-Rekursion ------------
create or replace function public.my_class_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select class_id from public.profiles where id = auth.uid()
$$;

-- ---- AUTO-CREATE PROFILE ON SIGNUP -------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
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
alter table public.todos                enable row level security;
alter table public.todo_completions     enable row level security;
alter table public.reminders            enable row level security;
alter table public.duties               enable row level security;

-- classes
drop policy if exists "classes_read" on public.classes;
create policy "classes_read" on public.classes for select to authenticated using (true);

-- profiles (nicht-rekursiv via my_class_id)
drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles for select to authenticated
  using (id = auth.uid());
drop policy if exists "profiles_read_classmates" on public.profiles;
create policy "profiles_read_classmates" on public.profiles for select to authenticated
  using (class_id = public.my_class_id());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- homework
drop policy if exists "homework_read" on public.homework;
create policy "homework_read" on public.homework for select to authenticated
  using (class_id = public.my_class_id());
drop policy if exists "homework_teacher_write" on public.homework;
create policy "homework_teacher_write" on public.homework for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and class_id = public.homework.class_id))
  with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher' and class_id = public.homework.class_id));

-- homework_completions
drop policy if exists "completions_read" on public.homework_completions;
create policy "completions_read" on public.homework_completions for select to authenticated
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('teacher', 'parent')
        and class_id = (select class_id from public.profiles where id = public.homework_completions.student_id)
    )
  );
drop policy if exists "completions_student_write" on public.homework_completions;
create policy "completions_student_write" on public.homework_completions for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id = public.my_class_id())
  );

-- todos
drop policy if exists "todos_read" on public.todos;
create policy "todos_read" on public.todos for select to authenticated
  using (class_id = public.my_class_id());
drop policy if exists "todos_teacher_write" on public.todos;
create policy "todos_teacher_write" on public.todos for insert to authenticated
  with check (class_id = public.my_class_id() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
drop policy if exists "todos_teacher_delete" on public.todos;
create policy "todos_teacher_delete" on public.todos for delete to authenticated
  using (created_by = auth.uid() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));

-- todo_completions
drop policy if exists "todo_completions_own" on public.todo_completions;
create policy "todo_completions_own" on public.todo_completions for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
drop policy if exists "todo_completions_teacher_read" on public.todo_completions;
create policy "todo_completions_teacher_read" on public.todo_completions for select to authenticated
  using (
    exists (select 1 from public.todos t where t.id = todo_id and t.class_id = public.my_class_id())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
drop policy if exists "todo_completions_parent_read" on public.todo_completions;
create policy "todo_completions_parent_read" on public.todo_completions for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'parent'
        and p.class_id = (select class_id from public.profiles where id = public.todo_completions.student_id)
    )
  );

-- reminders
drop policy if exists "reminders_read" on public.reminders;
create policy "reminders_read" on public.reminders for select to authenticated
  using (class_id = public.my_class_id());
drop policy if exists "reminders_insert" on public.reminders;
create policy "reminders_insert" on public.reminders for insert to authenticated
  with check (class_id = public.my_class_id() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
drop policy if exists "reminders_update" on public.reminders;
create policy "reminders_update" on public.reminders for update to authenticated
  using (created_by = auth.uid()) with check (class_id = public.my_class_id());
drop policy if exists "reminders_delete" on public.reminders;
create policy "reminders_delete" on public.reminders for delete to authenticated
  using (created_by = auth.uid());

-- gender column (for comic avatars)
alter table public.profiles add column if not exists gender text check (gender in ('m', 'f'));

-- Seed gender for known users
update public.profiles set gender = 'm' where full_name in (
  'Jonas Gruber','Max Bauer','Felix Wagner','Lukas Fischer','Noah Weber','Ben Lehner','Tim Steiner','David Moser'
) and gender is null;
update public.profiles set gender = 'f' where full_name in (
  'Anna Schneider','Sophie Müller','Emma Koch','Mia Huber','Lea Pichler','Julia Maier','Lena Hofer'
) and gender is null;
update public.profiles set gender = 'm' where role = 'teacher' and gender is null;

-- duties
drop policy if exists "duties_read" on public.duties;
create policy "duties_read" on public.duties for select to authenticated
  using (class_id = public.my_class_id());
drop policy if exists "duties_write" on public.duties;
create policy "duties_write" on public.duties for all to authenticated
  using (class_id = public.my_class_id() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'))
  with check (class_id = public.my_class_id() and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher'));
