-- Schüler und Eltern dürfen Lehrer ihrer eigenen Klasse sehen
DROP POLICY IF EXISTS "teacher_classes_read_class_members" ON public.teacher_classes;
CREATE POLICY "teacher_classes_read_class_members" ON public.teacher_classes
  FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
  );
