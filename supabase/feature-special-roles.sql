-- ============================================================
-- Feature: Spezialrollen für Schüler
-- - special_role auf profiles
-- - status ('published'|'pending') auf homework + reminders
-- - RLS-Policies aktualisiert
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

-- 1. special_role auf profiles
alter table public.profiles
  add column if not exists special_role text
  check (special_role in ('klassensprecher', 'stv_klassensprecher', 'hw_admin'));

-- 2. status auf homework
alter table public.homework
  add column if not exists status text not null default 'published'
  check (status in ('published', 'pending'));

-- 3. status auf reminders
alter table public.reminders
  add column if not exists status text not null default 'published'
  check (status in ('published', 'pending'));

-- 4. RLS homework: Lehrer sehen alles, andere nur published
drop policy if exists "homework_read" on public.homework;
create policy "homework_read" on public.homework for select to authenticated
  using (
    class_id = public.my_class_id()
    and (
      status = 'published'
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );

-- 5. RLS homework insert: Lehrer (published) + hw_admin Schüler (pending)
drop policy if exists "homework_teacher_write" on public.homework;
drop policy if exists "homework_insert" on public.homework;
create policy "homework_insert" on public.homework for insert to authenticated
  with check (
    class_id = public.my_class_id()
    and (
      -- Lehrer: darf published posten
      (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
       and status = 'published')
      or
      -- hw_admin Schüler: darf pending posten
      (exists (select 1 from public.profiles where id = auth.uid() and role = 'student' and special_role = 'hw_admin')
       and status = 'pending')
    )
  );

-- 6. RLS homework update: Lehrer (inkl. status-Änderung), Schüler nur eigene pending
drop policy if exists "homework_update" on public.homework;
create policy "homework_update" on public.homework for update to authenticated
  using (
    class_id = public.my_class_id()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      or (created_by = auth.uid() and status = 'pending')
    )
  )
  with check (class_id = public.my_class_id());

-- 7. RLS homework delete: Lehrer + Eigentümer (pending)
drop policy if exists "homework_delete" on public.homework;
create policy "homework_delete" on public.homework for delete to authenticated
  using (
    class_id = public.my_class_id()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      or created_by = auth.uid()
    )
  );

-- 8. RLS reminders: andere sehen nur published
drop policy if exists "reminders_read" on public.reminders;
create policy "reminders_read" on public.reminders for select to authenticated
  using (
    class_id = public.my_class_id()
    and (
      status = 'published'
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );

-- 9. RLS reminders insert: Lehrer (published) + Klassensprecher (pending)
drop policy if exists "reminders_insert" on public.reminders;
create policy "reminders_insert" on public.reminders for insert to authenticated
  with check (
    class_id = public.my_class_id()
    and (
      (exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
       and status = 'published')
      or
      (exists (select 1 from public.profiles where id = auth.uid() and role = 'student'
               and special_role in ('klassensprecher', 'stv_klassensprecher'))
       and status = 'pending')
    )
  );

-- 10. RLS reminders update: Lehrer (inkl. Status), Eigentümer pending
drop policy if exists "reminders_update" on public.reminders;
create policy "reminders_update" on public.reminders for update to authenticated
  using (
    class_id = public.my_class_id()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      or (created_by = auth.uid() and status = 'pending')
    )
  )
  with check (class_id = public.my_class_id());

-- 11. RLS reminders delete: Lehrer + Eigentümer
drop policy if exists "reminders_delete" on public.reminders;
create policy "reminders_delete" on public.reminders for delete to authenticated
  using (
    class_id = public.my_class_id()
    and (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      or created_by = auth.uid()
    )
  );
