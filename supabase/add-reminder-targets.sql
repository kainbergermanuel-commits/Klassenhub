-- Gezielte Erinnerungen: NULL = an alle, Array = nur diese Schüler
ALTER TABLE public.reminders
  ADD COLUMN IF NOT EXISTS target_student_ids uuid[];

-- reminders_read: Lehrer sehen alle ihrer Klasse; Schüler/Eltern nur wenn target NULL oder sie selbst drin sind
DROP POLICY IF EXISTS "reminders_read" ON public.reminders;
CREATE POLICY "reminders_read" ON public.reminders FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (
      status = 'published'
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    )
    AND (
      -- Lehrer sehen immer alle
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      -- Schüler: kein Target (alle) oder eigene ID im Array
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
        AND (target_student_ids IS NULL OR auth.uid() = ANY(target_student_ids))
      )
      -- Elternteil: kein Target oder Kind im Array
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
        AND (
          target_student_ids IS NULL
          OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'parent'
            AND child_id = ANY(target_student_ids)
          )
        )
      )
    )
  );
