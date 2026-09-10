-- ============================================================
-- ClassHaven · Ein Elternkonto, mehrere Kinder — STUFE 2: Funktionen
-- ------------------------------------------------------------
-- Führt die Mehrzahl-Varianten ein und erweitert my_class_ids().
-- Ändert noch KEINE Policy. Für Eltern mit genau einem Kind ist das
-- Ergebnis überall identisch zum bisherigen Verhalten.
--
-- Die Einzahl-Funktionen my_class_id() und my_student_id() bleiben als
-- Sicherheitsnetz bestehen; Stufe 3 hört auf, sie zu benutzen.
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

-- ---- 1) Alle Kinder des aktuellen Elternteils ----
CREATE OR REPLACE FUNCTION public.my_child_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT student_id FROM public.parent_children WHERE parent_id = auth.uid()
$$;

-- ---- 2) my_class_ids() um die Klassen der eigenen Kinder erweitern ----
-- Vorher: eigene Klassen als Lehrkraft + die eine eigene class_id.
-- Neu: zusätzlich die Klassen aller verknüpften Kinder. Damit gelten alle
-- klassenbezogenen Policies auch für Eltern mit Kindern in zwei Klassen.
CREATE OR REPLACE FUNCTION public.my_class_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT class_id FROM public.teacher_classes WHERE teacher_id = auth.uid()
  UNION
  SELECT class_id FROM public.profiles WHERE id = auth.uid() AND class_id IS NOT NULL
  UNION
  SELECT p.class_id
  FROM public.profiles p
  JOIN public.parent_children pc ON pc.student_id = p.id
  WHERE pc.parent_id = auth.uid() AND p.class_id IS NOT NULL
$$;

-- ---- 3) my_student_ids(): Mehrzahl von my_student_id() ----
-- Schüler: die eigene id. Eltern: alle verknüpften Kinder.
-- Wird von homework_read für die Hausübungs-Ausnahmen gebraucht.
CREATE OR REPLACE FUNCTION public.my_student_ids()
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT id FROM public.profiles WHERE id = auth.uid() AND role = 'student'
  UNION
  SELECT student_id FROM public.parent_children WHERE parent_id = auth.uid()
$$;

-- ---- Kontrolle ----
-- Erwartet: gleiche Anzahl wie parent_children, und kein Elternteil
-- verliert seine Klasse.
SELECT
  (SELECT count(*) FROM public.parent_children)                    AS verknuepfungen,
  (SELECT count(*) FROM public.profiles WHERE role = 'parent')     AS eltern,
  (SELECT count(*) FROM public.profiles p
     WHERE p.role = 'parent' AND p.class_id IS NOT NULL)           AS eltern_mit_klasse;
