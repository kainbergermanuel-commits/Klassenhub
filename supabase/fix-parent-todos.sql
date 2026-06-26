-- Allow parents to read todo_completions for students in their class
drop policy if exists "todo_completions_parent_read" on todo_completions;
create policy "todo_completions_parent_read" on todo_completions for select to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid()
        and p.role = 'parent'
        and p.class_id = (
          select class_id from profiles where id = todo_completions.student_id
        )
    )
  );
