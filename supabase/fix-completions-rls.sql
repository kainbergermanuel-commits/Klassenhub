-- Allow all class members to read completions of their classmates
-- (needed for streak leaderboard visible to students)
drop policy if exists "completions_read" on public.homework_completions;

create policy "completions_read" on public.homework_completions
  for select to authenticated
  using (
    exists (
      select 1 from public.profiles me
      join public.profiles them on them.class_id = me.class_id
      where me.id = auth.uid()
        and them.id = public.homework_completions.student_id
    )
  );
