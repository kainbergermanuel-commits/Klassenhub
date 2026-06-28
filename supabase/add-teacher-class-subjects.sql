-- Fächer pro Lehrer+Klasse (statt global in profiles.subjects)
ALTER TABLE public.teacher_classes
  ADD COLUMN IF NOT EXISTS subjects jsonb;

-- Lehrer darf subjects in eigenen Zeilen aktualisieren
DROP POLICY IF EXISTS "teacher_classes_update_own" ON public.teacher_classes;
CREATE POLICY "teacher_classes_update_own" ON public.teacher_classes
  FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid())
  WITH CHECK (teacher_id = auth.uid());
