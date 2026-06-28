-- Stundenplan pro Schüler
CREATE TABLE public.timetable_entries (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day        smallint NOT NULL CHECK (day BETWEEN 1 AND 5), -- 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr
  slot       smallint NOT NULL CHECK (slot BETWEEN 1 AND 10),
  subject    text NOT NULL,
  UNIQUE (student_id, day, slot)
);

ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- Schüler: eigene Einträge lesen und schreiben
CREATE POLICY "student_own" ON public.timetable_entries
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

-- Elternteil: Einträge des Kindes lesen
CREATE POLICY "parent_read_child" ON public.timetable_entries
  FOR SELECT TO authenticated
  USING (
    student_id = (
      SELECT child_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'parent'
    )
  );

-- Admin: voller Zugriff
CREATE POLICY "admin_all" ON public.timetable_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));
