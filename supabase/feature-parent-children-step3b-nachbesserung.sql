-- ============================================================
-- ClassHaven · Mehrere Kinder — STUFE 3b: Nachbesserung
-- ------------------------------------------------------------
-- Zwei Korrekturen aus dem Selbstcheck nach Stufe 3.
--
-- ⚠️ Setzt Stufe 1 bis 3 voraus.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

-- ---- 1) homework_read: Ausnahme auf die Kinder DIESER Klasse eingrenzen ----
--
-- Fehler in Stufe 3: geprüft wurde "irgendeines meiner Kinder ist nicht
-- ausgenommen". Bei zwei Kindern in zwei Klassen wurde damit eine Hausübung
-- der Klasse A sichtbar, weil das Kind in Klasse B nicht ausgenommen ist.
-- Das Kind in Klasse B kann von dieser Hausübung aber gar nicht betroffen sein.
--
-- Richtig ist: es zählt nur, ob eines meiner Kinder, das IN DER KLASSE DIESER
-- HAUSÜBUNG sitzt, nicht ausgenommen ist.
DROP POLICY IF EXISTS "homework_read" ON public.homework;
CREATE POLICY "homework_read" ON public.homework FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (status = 'published' OR public.is_teacher() OR created_by = (SELECT auth.uid()))
    AND (
      public.is_teacher()
      OR excluded_student_ids IS NULL
      -- Konten ohne Kindbezug (Admin ohne Lehrerrolle) trifft die Ausnahme nicht.
      OR NOT EXISTS (SELECT 1 FROM public.my_student_ids())
      OR EXISTS (
        SELECT 1
        FROM public.my_student_ids() s
        JOIN public.profiles p ON p.id = s
        WHERE p.class_id = homework.class_id
          AND NOT (s = ANY (excluded_student_ids))
      )
    )
  );

-- ---- 2) attendance_parent_insert: Klasse an das Kind binden ----
--
-- Bisher musste die mitgegebene class_id nur irgendeine meiner Klassen sein.
-- Mit zwei Kindern in zwei Klassen ließe sich damit eine Abmeldung unter der
-- falschen Klasse eintragen. Die Klasse muss die des gemeldeten Kindes sein.
DROP POLICY IF EXISTS "attendance_parent_insert" ON public.attendance;
CREATE POLICY "attendance_parent_insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    source = 'parent'
    AND status = 'entschuldigt'
    AND confirmed_by IS NULL
    AND confirmed_at IS NULL
    AND reported_by = auth.uid()
    AND student_id IN (SELECT public.my_child_ids())
    AND class_id = (SELECT class_id FROM public.profiles WHERE id = student_id)
  );

-- ---- 3) Lehrkräfte dürfen die Verknüpfungen ihrer Klassen lesen ----
--
-- Stufe 1 hat nur "parent_children_read_own" angelegt (parent_id = auth.uid()).
-- Damit sähe eine Lehrkraft die Verknüpfungen nicht, und Klassenliste wie
-- Mitteilungsheft könnten Eltern nicht mehr über ihre Kinder finden. Nötig ist
-- das, weil ein zusammengeführtes Elternkonto nur EINE class_id trägt und in
-- der zweiten Klasse sonst unsichtbar bliebe.
DROP POLICY IF EXISTS "parent_children_read_teacher" ON public.parent_children;
CREATE POLICY "parent_children_read_teacher" ON public.parent_children
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    AND (SELECT class_id FROM public.profiles WHERE id = student_id)
        IN (SELECT public.my_class_ids())
  );

-- ---- Kontrolle ----
-- Erwartet: beide Policies vorhanden, beide nutzen die Mehrzahl.
SELECT c.relname AS tabelle, p.polname AS policy,
       (pg_get_expr(p.polqual, p.polrelid) ILIKE '%my_student_ids%'
        OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%my_child_ids%') AS mehrzahl_aktiv
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND p.polname IN ('homework_read', 'attendance_parent_insert');
