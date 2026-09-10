-- ============================================================
-- ClassHaven · Rückweg aus STUFE 3
-- ------------------------------------------------------------
-- Stellt die 15 Policies auf den Stand vor der Mehrkind-Umstellung
-- zurück. Wortlaut aus der Inventur vom 10.09.2026.
--
-- parent_children, my_child_ids(), my_student_ids() und die Erweiterung
-- von my_class_ids() bleiben bestehen; sie sind additiv und stören
-- nicht. Wer auch die zurückdrehen will, führt danach den Block ganz
-- unten aus.
--
-- Idempotent. Im Supabase SQL-Editor ausführen, danach Login testen.
-- ============================================================

DROP POLICY IF EXISTS "attendance_parent_read" ON public.attendance;
CREATE POLICY "attendance_parent_read" ON public.attendance FOR SELECT TO authenticated
  USING (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "duty_completions_parent_read" ON public.duty_completions;
CREATE POLICY "duty_completions_parent_read" ON public.duty_completions FOR SELECT TO authenticated
  USING (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS "homework_extensions_parent_read" ON public.homework_extensions;
CREATE POLICY "homework_extensions_parent_read" ON public.homework_extensions FOR SELECT TO authenticated
  USING (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS "parent_nudges_parent_read" ON public.parent_nudges;
CREATE POLICY "parent_nudges_parent_read" ON public.parent_nudges FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles
                 WHERE id = auth.uid() AND role = 'parent' AND child_id = parent_nudges.student_id));

DROP POLICY IF EXISTS "streak_freezes_parent_read" ON public.streak_freezes;
CREATE POLICY "streak_freezes_parent_read" ON public.streak_freezes FOR SELECT TO authenticated
  USING (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS "parent_read_child" ON public.timetable_entries;
CREATE POLICY "parent_read_child" ON public.timetable_entries FOR SELECT TO authenticated
  USING (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS "parents_confirm_child_hw_completion" ON public.homework_completions;
CREATE POLICY "parents_confirm_child_hw_completion" ON public.homework_completions FOR UPDATE TO authenticated
  USING      (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'))
  WITH CHECK (student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid() AND role = 'parent'));

DROP POLICY IF EXISTS "attendance_parent_insert" ON public.attendance;
CREATE POLICY "attendance_parent_insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    source = 'parent' AND status = 'entschuldigt'
    AND confirmed_by IS NULL AND confirmed_at IS NULL
    AND reported_by = auth.uid()
    AND student_id = (SELECT child_id FROM public.profiles WHERE id = auth.uid())
    AND class_id IN (SELECT public.my_class_ids())
  );

DROP POLICY IF EXISTS "events_read" ON public.events;
CREATE POLICY "events_read" ON public.events FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
          AND (target_student_ids IS NULL OR auth.uid() = ANY (target_student_ids)))
      OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
          AND (target_student_ids IS NULL
               OR EXISTS (SELECT 1 FROM public.profiles
                          WHERE id = auth.uid() AND role = 'parent'
                            AND child_id = ANY (events.target_student_ids))))
    )
  );

DROP POLICY IF EXISTS "reminders_read" ON public.reminders;
CREATE POLICY "reminders_read" ON public.reminders FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (status = 'published'
         OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher'))
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
          AND (target_student_ids IS NULL OR auth.uid() = ANY (target_student_ids)))
      OR (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
          AND (target_student_ids IS NULL
               OR EXISTS (SELECT 1 FROM public.profiles
                          WHERE id = auth.uid() AND role = 'parent'
                            AND child_id = ANY (reminders.target_student_ids))))
    )
  );

-- ⚠️ Achtung: hiermit kehrt auch der Rückfallpfad zurück, der bei
-- fehlender Verknüpfung Schreibzugriff auf alle Kinder der Klasse gibt.
DROP POLICY IF EXISTS "streak_parent_write" ON public.streak_confirmations;
CREATE POLICY "streak_parent_write" ON public.streak_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role = 'parent'
              AND p.class_id = (SELECT class_id FROM public.profiles WHERE id = student_id))
    AND ((SELECT child_id FROM public.profiles WHERE id = auth.uid()) IS NULL
         OR (SELECT child_id FROM public.profiles WHERE id = auth.uid()) = student_id)
  );

DROP POLICY IF EXISTS "streak_parent_read" ON public.streak_confirmations;
CREATE POLICY "streak_parent_read" ON public.streak_confirmations FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'parent'
                   AND p.class_id = (SELECT class_id FROM public.profiles
                                     WHERE id = streak_confirmations.student_id)));

DROP POLICY IF EXISTS "todo_completions_parent_read" ON public.todo_completions;
CREATE POLICY "todo_completions_parent_read" ON public.todo_completions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p
                 WHERE p.id = auth.uid() AND p.role = 'parent'
                   AND p.class_id = (SELECT class_id FROM public.profiles
                                     WHERE id = todo_completions.student_id)));

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (parent_id = auth.uid() AND sender_id = auth.uid() AND class_id = public.my_class_id())
    OR (sender_id = auth.uid()
        AND class_id IN (SELECT public.my_class_ids())
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
        AND EXISTS (SELECT 1 FROM public.profiles p
                    WHERE p.id = messages.parent_id AND p.role = 'parent'
                      AND p.class_id = messages.class_id))
  );

DROP POLICY IF EXISTS "homework_read" ON public.homework;
CREATE POLICY "homework_read" ON public.homework FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (status = 'published' OR public.is_teacher() OR created_by = (SELECT auth.uid()))
    AND (public.is_teacher()
         OR excluded_student_ids IS NULL
         OR public.my_student_id() IS NULL
         OR NOT (public.my_student_id() = ANY (excluded_student_ids)))
  );

-- ============================================================
-- Optional: auch die additiven Teile zurückdrehen.
-- Nur ausführen, wenn das Vorhaben ganz aufgegeben wird.
-- ============================================================
-- CREATE OR REPLACE FUNCTION public.my_class_ids()
-- RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
-- SET search_path = public AS $$
--   SELECT class_id FROM public.teacher_classes WHERE teacher_id = auth.uid()
--   UNION
--   SELECT class_id FROM public.profiles WHERE id = auth.uid() AND class_id IS NOT NULL
-- $$;
-- DROP FUNCTION IF EXISTS public.my_child_ids();
-- DROP FUNCTION IF EXISTS public.my_student_ids();
-- DROP TABLE IF EXISTS public.parent_children;
