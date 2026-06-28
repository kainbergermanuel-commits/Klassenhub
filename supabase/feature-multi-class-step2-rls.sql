-- ============================================================
-- KlassenHub · Multi-Klasse pro Lehrer — STUFE 2: RLS-Umstellung
-- ------------------------------------------------------------
-- Führt my_class_ids() ein (SETOF uuid) und stellt die 22 klassen-
-- bezogenen Policies von "= my_class_id()" auf "IN (SELECT my_class_ids())"
-- um. Für bestehende Single-Class-User identisch; Lehrer mit mehreren
-- Klassen sehen/verwalten alle ihre Klassen.
--
-- my_class_id() bleibt als Alias erhalten (Sicherheitsnetz).
-- Bei Problemen: rollback-policies-before-multiclass.sql ausführen.
-- Idempotent. Im Supabase SQL-Editor ausführen, danach Login testen.
-- ============================================================

-- Set aller Klassen des aktuellen Users:
--  - Lehrer: alle Zuweisungen aus teacher_classes
--  - Schüler/Eltern: ihre eine profiles.class_id
-- SECURITY DEFINER → keine RLS-Rekursion (wie my_class_id()).
CREATE OR REPLACE FUNCTION public.my_class_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT class_id FROM public.teacher_classes WHERE teacher_id = auth.uid()
  UNION
  SELECT class_id FROM public.profiles WHERE id = auth.uid() AND class_id IS NOT NULL
$$;

-- ---- duties ----
DROP POLICY IF EXISTS "duties_read" ON public.duties;
CREATE POLICY "duties_read" ON public.duties FOR SELECT TO authenticated
  USING (class_id IN (SELECT public.my_class_ids()));

DROP POLICY IF EXISTS "duties_write" ON public.duties;
CREATE POLICY "duties_write" ON public.duties FOR ALL TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')))
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')));

-- ---- homework ----
DROP POLICY IF EXISTS "homework_delete" ON public.homework;
CREATE POLICY "homework_delete" ON public.homework FOR DELETE TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) OR (created_by = auth.uid())));

DROP POLICY IF EXISTS "homework_insert" ON public.homework;
CREATE POLICY "homework_insert" ON public.homework FOR INSERT TO authenticated
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND (((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) AND (status = 'published')) OR ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'student' AND profiles.special_role = 'hw_admin')) AND (status = 'pending'))));

DROP POLICY IF EXISTS "homework_read" ON public.homework;
CREATE POLICY "homework_read" ON public.homework FOR SELECT TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((status = 'published') OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'))));

DROP POLICY IF EXISTS "homework_update" ON public.homework;
CREATE POLICY "homework_update" ON public.homework FOR UPDATE TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) OR ((created_by = auth.uid()) AND (status = 'pending'))))
  WITH CHECK (class_id IN (SELECT public.my_class_ids()));

-- ---- homework_completions ----
DROP POLICY IF EXISTS "completions_class_read" ON public.homework_completions;
CREATE POLICY "completions_class_read" ON public.homework_completions FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM profiles WHERE class_id IN (SELECT public.my_class_ids())));

DROP POLICY IF EXISTS "completions_student_write" ON public.homework_completions;
CREATE POLICY "completions_student_write" ON public.homework_completions FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK ((student_id = auth.uid()) AND (EXISTS (SELECT 1 FROM homework h WHERE h.id = homework_completions.homework_id AND h.class_id IN (SELECT public.my_class_ids()))));

-- ---- profiles ----
DROP POLICY IF EXISTS "profiles_read_classmates" ON public.profiles;
CREATE POLICY "profiles_read_classmates" ON public.profiles FOR SELECT TO authenticated
  USING (class_id IN (SELECT public.my_class_ids()));

DROP POLICY IF EXISTS "profiles_teacher_manage" ON public.profiles;
CREATE POLICY "profiles_teacher_manage" ON public.profiles FOR ALL TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND is_teacher())
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND is_teacher());

DROP POLICY IF EXISTS "profiles_teacher_special_role" ON public.profiles;
CREATE POLICY "profiles_teacher_special_role" ON public.profiles FOR UPDATE TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND is_teacher())
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND is_teacher());

-- ---- reminder_views ----
DROP POLICY IF EXISTS "reminder_views_own" ON public.reminder_views;
CREATE POLICY "reminder_views_own" ON public.reminder_views FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK ((student_id = auth.uid()) AND (EXISTS (SELECT 1 FROM reminders r WHERE r.id = reminder_views.reminder_id AND r.class_id IN (SELECT public.my_class_ids()))));

DROP POLICY IF EXISTS "reminder_views_teacher_read" ON public.reminder_views;
CREATE POLICY "reminder_views_teacher_read" ON public.reminder_views FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) AND (EXISTS (SELECT 1 FROM reminders r WHERE r.id = reminder_views.reminder_id AND r.class_id IN (SELECT public.my_class_ids()))));

-- ---- reminders ----
DROP POLICY IF EXISTS "reminders_delete" ON public.reminders;
CREATE POLICY "reminders_delete" ON public.reminders FOR DELETE TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) OR (created_by = auth.uid())));

DROP POLICY IF EXISTS "reminders_insert" ON public.reminders;
CREATE POLICY "reminders_insert" ON public.reminders FOR INSERT TO authenticated
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND (((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) AND (status = 'published')) OR ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'student' AND profiles.special_role = ANY (ARRAY['klassensprecher','stv_klassensprecher']))) AND (status = 'pending'))));

DROP POLICY IF EXISTS "reminders_read" ON public.reminders;
CREATE POLICY "reminders_read" ON public.reminders FOR SELECT TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((status = 'published') OR (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher'))));

DROP POLICY IF EXISTS "reminders_update" ON public.reminders;
CREATE POLICY "reminders_update" ON public.reminders FOR UPDATE TO authenticated
  USING ((class_id IN (SELECT public.my_class_ids())) AND ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) OR ((created_by = auth.uid()) AND (status = 'pending'))))
  WITH CHECK (class_id IN (SELECT public.my_class_ids()));

-- ---- streak_confirmations ----
DROP POLICY IF EXISTS "streak_class_read" ON public.streak_confirmations;
CREATE POLICY "streak_class_read" ON public.streak_confirmations FOR SELECT TO authenticated
  USING (student_id IN (SELECT id FROM profiles WHERE class_id IN (SELECT public.my_class_ids())));

DROP POLICY IF EXISTS "streak_teacher_read" ON public.streak_confirmations;
CREATE POLICY "streak_teacher_read" ON public.streak_confirmations FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')) AND (EXISTS (SELECT 1 FROM profiles s WHERE s.id = streak_confirmations.student_id AND s.class_id IN (SELECT public.my_class_ids()))));

-- ---- todo_completions ----
DROP POLICY IF EXISTS "todo_completions_teacher_read" ON public.todo_completions;
CREATE POLICY "todo_completions_teacher_read" ON public.todo_completions FOR SELECT TO authenticated
  USING ((EXISTS (SELECT 1 FROM todos t WHERE t.id = todo_completions.todo_id AND t.class_id IN (SELECT public.my_class_ids()))) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')));

-- ---- todos ----
DROP POLICY IF EXISTS "todos_read" ON public.todos;
CREATE POLICY "todos_read" ON public.todos FOR SELECT TO authenticated
  USING (class_id IN (SELECT public.my_class_ids()));

DROP POLICY IF EXISTS "todos_teacher_write" ON public.todos;
CREATE POLICY "todos_teacher_write" ON public.todos FOR INSERT TO authenticated
  WITH CHECK ((class_id IN (SELECT public.my_class_ids())) AND (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'teacher')));
