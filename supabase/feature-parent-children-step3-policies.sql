-- ============================================================
-- ClassHaven · Ein Elternkonto, mehrere Kinder — STUFE 3: Policies
-- ------------------------------------------------------------
-- Stellt 15 Policies von der Einzahl auf die Mehrzahl um. Grundlage ist
-- die Inventur aus Stufe 0, nicht die Migrationsdateien.
--
-- Für Eltern mit genau einem Kind ist jede einzelne Umstellung
-- verhaltensgleich. Geändert wird ausschließlich, was bei zwei Kindern
-- heute zu wenig zurückgibt.
--
-- ⚠️ VORHER Stufe 1 und Stufe 2 ausführen.
-- ⚠️ Rückweg: rollback-policies-before-multichild.sql
--
-- Idempotent. Im Supabase SQL-Editor ausführen, danach Login testen.
-- ============================================================

-- ============================================================
-- A) Reine Kind-Prädikate: "= child_id" wird zu "IN (my_child_ids())"
-- ============================================================

DROP POLICY IF EXISTS "attendance_parent_read" ON public.attendance;
CREATE POLICY "attendance_parent_read" ON public.attendance FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS "duty_completions_parent_read" ON public.duty_completions;
CREATE POLICY "duty_completions_parent_read" ON public.duty_completions FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS "homework_extensions_parent_read" ON public.homework_extensions;
CREATE POLICY "homework_extensions_parent_read" ON public.homework_extensions FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS "parent_nudges_parent_read" ON public.parent_nudges;
CREATE POLICY "parent_nudges_parent_read" ON public.parent_nudges FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS "streak_freezes_parent_read" ON public.streak_freezes;
CREATE POLICY "streak_freezes_parent_read" ON public.streak_freezes FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

DROP POLICY IF EXISTS "parent_read_child" ON public.timetable_entries;
CREATE POLICY "parent_read_child" ON public.timetable_entries FOR SELECT TO authenticated
  USING (student_id IN (SELECT public.my_child_ids()));

-- Schreibend: Eltern bestätigen die Hausübung ihres Kindes.
DROP POLICY IF EXISTS "parents_confirm_child_hw_completion" ON public.homework_completions;
CREATE POLICY "parents_confirm_child_hw_completion" ON public.homework_completions FOR UPDATE TO authenticated
  USING      (student_id IN (SELECT public.my_child_ids()))
  WITH CHECK (student_id IN (SELECT public.my_child_ids()));

-- Schreibend: Krankmeldung durch Eltern.
DROP POLICY IF EXISTS "attendance_parent_insert" ON public.attendance;
CREATE POLICY "attendance_parent_insert" ON public.attendance FOR INSERT TO authenticated
  WITH CHECK (
    source = 'parent'
    AND status = 'entschuldigt'
    AND confirmed_by IS NULL
    AND confirmed_at IS NULL
    AND reported_by = auth.uid()
    AND student_id IN (SELECT public.my_child_ids())
    AND class_id  IN (SELECT public.my_class_ids())
  );

-- ============================================================
-- B) Zielgruppen-Zweige: "child_id = ANY(target)" wird zu
--    "eines meiner Kinder ist im Ziel enthalten"
-- ============================================================

DROP POLICY IF EXISTS "events_read" ON public.events;
CREATE POLICY "events_read" ON public.events FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
        AND (target_student_ids IS NULL OR auth.uid() = ANY (target_student_ids))
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
        AND (
          target_student_ids IS NULL
          OR EXISTS (SELECT 1 FROM public.my_child_ids() k WHERE k = ANY (events.target_student_ids))
        )
      )
    )
  );

DROP POLICY IF EXISTS "reminders_read" ON public.reminders;
CREATE POLICY "reminders_read" ON public.reminders FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (
      status = 'published'
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
    )
    AND (
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'student')
        AND (target_student_ids IS NULL OR auth.uid() = ANY (target_student_ids))
      )
      OR (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'parent')
        AND (
          target_student_ids IS NULL
          OR EXISTS (SELECT 1 FROM public.my_child_ids() k WHERE k = ANY (reminders.target_student_ids))
        )
      )
    )
  );

-- ============================================================
-- C) Der Rückfallpfad verschwindet
-- ------------------------------------------------------------
-- Bisher galt: "child_id IS NULL ODER child_id = student_id". Bei
-- fehlender Verknüpfung erlaubte das Schreibzugriff auf JEDES Kind der
-- Klasse. Mit my_child_ids() entfällt dieser Zweig ersatzlos: keine
-- Verknüpfung bedeutet jetzt kein Zugriff.
-- Die vorgelagerte Klassenprüfung wird überflüssig, weil die Kindprüfung
-- strikt stärker ist.
-- ============================================================

DROP POLICY IF EXISTS "streak_parent_write" ON public.streak_confirmations;
CREATE POLICY "streak_parent_write" ON public.streak_confirmations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
    AND student_id IN (SELECT public.my_child_ids())
  );

-- ============================================================
-- D) Inline-Klassenprüfungen für Eltern
-- ------------------------------------------------------------
-- Diese beiden geben Eltern bewusst KLASSENWEITEN Lesezugriff; davon
-- lebt die Karte "Ihr Kind und die Klasse". Der Umfang bleibt deshalb
-- gleich, nur die eine Klasse wird zu allen Klassen meiner Kinder.
-- ============================================================

DROP POLICY IF EXISTS "streak_parent_read" ON public.streak_confirmations;
CREATE POLICY "streak_parent_read" ON public.streak_confirmations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
    AND (SELECT class_id FROM public.profiles WHERE id = streak_confirmations.student_id)
        IN (SELECT public.my_class_ids())
  );

DROP POLICY IF EXISTS "todo_completions_parent_read" ON public.todo_completions;
CREATE POLICY "todo_completions_parent_read" ON public.todo_completions FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'parent')
    AND (SELECT class_id FROM public.profiles WHERE id = todo_completions.student_id)
        IN (SELECT public.my_class_ids())
  );

-- ============================================================
-- E) Letztes my_class_id() im Singular
-- ------------------------------------------------------------
-- Ohne das könnte ein Elternteil nur in der Klasse des Hauptkindes
-- schreiben.
-- ============================================================

DROP POLICY IF EXISTS "messages_insert" ON public.messages;
CREATE POLICY "messages_insert" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (
      parent_id = auth.uid()
      AND sender_id = auth.uid()
      AND class_id IN (SELECT public.my_class_ids())
    )
    OR (
      sender_id = auth.uid()
      AND class_id IN (SELECT public.my_class_ids())
      AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'teacher')
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = messages.parent_id AND p.role = 'parent' AND p.class_id = messages.class_id
      )
    )
  );

-- ============================================================
-- F) Hausübungs-Ausnahmen: my_student_id() wird zur Mehrzahl
-- ------------------------------------------------------------
-- Neue Regel: die Hausübung ist sichtbar, solange MINDESTENS EINES
-- meiner Kinder nicht ausgenommen ist.
-- ============================================================

DROP POLICY IF EXISTS "homework_read" ON public.homework;
CREATE POLICY "homework_read" ON public.homework FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    AND (status = 'published' OR public.is_teacher() OR created_by = (SELECT auth.uid()))
    AND (
      public.is_teacher()
      OR excluded_student_ids IS NULL
      OR NOT EXISTS (SELECT 1 FROM public.my_student_ids())
      OR EXISTS (
        SELECT 1 FROM public.my_student_ids() s
        WHERE NOT (s = ANY (excluded_student_ids))
      )
    )
  );

-- ---- Kontrolle ----
-- Erwartet: 0 Zeilen. Keine Policy darf danach noch auf die Einzahl zeigen.
SELECT c.relname AS tabelle, p.polname AS policy
FROM pg_policy p
JOIN pg_class c     ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
       pg_get_expr(p.polqual,      p.polrelid) ILIKE '%child_id%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%child_id%'
    OR pg_get_expr(p.polqual,      p.polrelid) ILIKE '%my_class_id()%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%my_class_id()%'
    OR pg_get_expr(p.polqual,      p.polrelid) ILIKE '%my_student_id()%'
    OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%my_student_id()%'
  );
