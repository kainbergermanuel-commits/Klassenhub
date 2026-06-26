-- Alte todos-Tabelle ersetzen (falls schon vorhanden, löschen)
drop table if exists todos cascade;

-- Todos: klassenweite Aufgaben, erstellt vom Lehrer
create table todos (
  id uuid primary key default gen_random_uuid(),
  class_id uuid references classes(id) not null,
  title text not null,
  week_start date not null,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);
alter table todos enable row level security;

-- Alle Klassenmitglieder können lesen
create policy "todos_read" on todos for select to authenticated
  using (class_id = public.my_class_id());

-- Nur Lehrer dürfen schreiben/löschen
create policy "todos_teacher_write" on todos for insert to authenticated
  with check (
    class_id = public.my_class_id() and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
create policy "todos_teacher_delete" on todos for delete to authenticated
  using (
    created_by = auth.uid() and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

-- Erledigungen pro Schüler (wie homework_completions)
drop policy if exists "todo_completions_own" on todo_completions;
drop policy if exists "todo_completions_teacher_read" on todo_completions;
drop table if exists todo_completions cascade;
create table todo_completions (
  todo_id uuid references todos(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  completed_at timestamptz default now(),
  primary key (todo_id, student_id)
);
alter table todo_completions enable row level security;
create policy "todo_completions_own" on todo_completions for all to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "todo_completions_teacher_read" on todo_completions for select to authenticated
  using (
    exists (
      select 1 from todos t
      where t.id = todo_id and t.class_id = public.my_class_id()
    ) and
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );
