-- Todos (persönlich, wochenbezogen)
create table if not exists todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  class_id uuid references classes(id),
  title text not null,
  done boolean default false not null,
  week_start date not null,
  created_at timestamptz default now()
);
alter table todos enable row level security;
create policy "todos_own" on todos for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Erinnerungen / Termine
create table if not exists reminders (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) not null,
  title text not null,
  description text,
  event_date date not null,
  event_time text,
  event_end_time text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table reminders enable row level security;
create policy "reminders_read" on reminders for select to authenticated
  using (class_id = public.my_class_id());
create policy "reminders_insert" on reminders for insert to authenticated
  with check (
    class_id = public.my_class_id() and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
create policy "reminders_delete" on reminders for delete to authenticated
  using (created_by = auth.uid());

-- Dienste
create table if not exists duties (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) not null,
  week_start date not null,
  duty_name text not null,
  assignee_ids uuid[] not null default '{}',
  created_by uuid references profiles(id),
  created_at timestamptz default now(),
  unique(class_id, week_start, duty_name)
);
alter table duties enable row level security;
create policy "duties_read" on duties for select to authenticated
  using (class_id = public.my_class_id());
create policy "duties_write" on duties for all to authenticated
  using (
    class_id = public.my_class_id() and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id = public.my_class_id() and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
