-- ============================================================
-- KlassenHub · Multi-Klasse pro Lehrer — STUFE 1: Schema (additiv)
-- ------------------------------------------------------------
-- Legt die n:m-Verknüpfung Lehrer↔Klassen an und befüllt sie aus
-- dem Ist-Zustand. Ändert KEINE bestehende Policy/Funktion.
-- → Kann den Login NICHT brechen. Idempotent.
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

-- Junction: ein Lehrer kann mehreren Klassen zugewiesen sein.
-- Schüler/Eltern bleiben unverändert 1:1 über profiles.class_id.
CREATE TABLE IF NOT EXISTS public.teacher_classes (
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  class_id   uuid NOT NULL REFERENCES public.classes(id)  ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,  -- Home-/Standardklasse des Lehrers
  PRIMARY KEY (teacher_id, class_id)
);

CREATE INDEX IF NOT EXISTS teacher_classes_class_idx ON public.teacher_classes (class_id);

-- Backfill: jede bestehende Lehrkraft mit ihrer aktuellen class_id eintragen,
-- als Primärklasse. Bestehende Single-Class-Lehrer verhalten sich danach
-- exakt wie vorher (genau eine Zeile).
INSERT INTO public.teacher_classes (teacher_id, class_id, is_primary)
SELECT id, class_id, true
FROM public.profiles
WHERE role = 'teacher' AND class_id IS NOT NULL
ON CONFLICT (teacher_id, class_id) DO NOTHING;

-- RLS für die neue Tabelle.
ALTER TABLE public.teacher_classes ENABLE ROW LEVEL SECURITY;

-- Lehrer darf seine eigenen Zuweisungen lesen (z.B. für den Klassen-Umschalter).
DROP POLICY IF EXISTS "teacher_classes_read_own" ON public.teacher_classes;
CREATE POLICY "teacher_classes_read_own" ON public.teacher_classes
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

-- Admin darf alle Zuweisungen lesen und verwalten (Lehrer Klassen zuteilen).
DROP POLICY IF EXISTS "teacher_classes_admin_all" ON public.teacher_classes;
CREATE POLICY "teacher_classes_admin_all" ON public.teacher_classes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Kontrolle: sollte pro bestehender Lehrkraft genau eine Zeile zeigen.
-- SELECT p.full_name, c.name, tc.is_primary
-- FROM public.teacher_classes tc
-- JOIN public.profiles p ON p.id = tc.teacher_id
-- JOIN public.classes  c ON c.id = tc.class_id
-- ORDER BY p.full_name;
