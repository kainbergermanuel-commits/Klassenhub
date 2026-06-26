-- ============================================================
-- RLS-Härtung — nur die NEUEN Änderungen gegenüber dem bisher
-- deployten Stand. Auf der bestehenden DB ausführen.
-- (Alles davon ist auch in schema_full.sql enthalten.)
-- ============================================================

-- 1. Schüler dürfen Erledigungen nur für HÜ der EIGENEN Klasse setzen.
drop policy if exists "completions_student_write" on public.homework_completions;
create policy "completions_student_write" on public.homework_completions for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id = public.my_class_id())
  );

-- 2. Erinnerungen editierbar machen (Ersteller-Lehrkraft).
drop policy if exists "reminders_update" on public.reminders;
create policy "reminders_update" on public.reminders for update to authenticated
  using (created_by = auth.uid())
  with check (class_id = public.my_class_id());
