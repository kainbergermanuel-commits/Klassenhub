-- ============================================================
-- Seed: 15 Hausübungen über KW24–KW27 + streak-konforme
--       Erledigungsstände aller Schüler
--
-- WICHTIG: Das Streak-System zählt AUFEINANDERFOLGENDE erledigte
-- HÜ von der aktuellsten rückwärts. Fehlt eine neuere HÜ, bricht
-- die Streak sofort. Die Completions sind daher so gestaltet,
-- dass die gewünschten Streak-Längen entstehen.
--
-- Erwartete Streaks nach Ausführung:
--   Lena Hofer       13  → Meilensteine 5 + 10
--   Anna Schneider   13  → Meilensteine 5 + 10
--   Sophie Müller    10  → Meilensteine 5 + 10
--   Mia Huber         8  → Meilenstein  5
--   Emma Koch         5  → Meilenstein  5
--   Lea Pichler       5  → Meilenstein  5
--   Julia Maier       4
--   Felix Wagner      3
--   Lukas Fischer     2
--   Jonas Gruber      1
--   Max/Noah/Tim/Ben/David  0
--
-- Idempotent: löscht vorhandene Completions + HÜ der Klasse
-- und legt alles neu an.
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

DO $$
DECLARE
  v_class_id   uuid;
  v_teacher_id uuid;
BEGIN
  SELECT id, class_id
    INTO v_teacher_id, v_class_id
    FROM public.profiles
   WHERE role = 'teacher'
   LIMIT 1;

  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'Kein Lehrer-Profil mit class_id gefunden.';
  END IF;

  -- ── Vorhandene Completions + HÜ bereinigen ───────────────
  DELETE FROM public.homework_completions
   WHERE homework_id IN (
     SELECT id FROM public.homework WHERE class_id = v_class_id
   );

  DELETE FROM public.homework WHERE class_id = v_class_id;

  -- ── 15 Hausübungen einfügen ──────────────────────────────
  -- Reihenfolge nach Fälligkeitsdatum (älteste zuerst)
  -- Streak-Reihenfolge (neueste zuerst):
  --  #1  Pflanzen bestimmen          2026-06-26
  --  #2  Grammar Unit 9              2026-06-25
  --  #3  Geometrie                   2026-06-23
  --  #4  Klimazonen                  2026-06-20
  --  #5  Gedichtanalyse Erlkönig     2026-06-19
  --  #6  Short Story                 2026-06-18
  --  #7  Kräfte und Bewegung         2026-06-17
  --  #8  Textaufgaben S. 87          2026-06-16
  --  #9  Vocabulary Unit 8           2026-06-13
  --  #10 Fragen zur Frühen Neuzeit   2026-06-13
  --  #11 Erlebnisaufsatz             2026-06-11
  --  #12 Ökosystem Wald              2026-06-10
  --  #13 Gleichungen Kap. 5          2026-06-09
  --  #14 Textinterpretation          2026-06-30  (bevorstehend)
  --  #15 Algebra Prüfungsvorbereitung 2026-07-02 (bevorstehend)

  INSERT INTO public.homework
    (class_id, subject, subject_short, subject_color, title, due_date, created_by)
  VALUES
    -- KW 24 (vergangen)
    (v_class_id, 'Mathematik', 'M', '#3B82F6', 'Gleichungen Kap. 5 – Übungsaufgaben',           '2026-06-09', v_teacher_id),
    (v_class_id, 'Biologie',   'BU', '#10B981', 'Ökosystem Wald – Zusammenfassung schreiben',    '2026-06-10', v_teacher_id),
    (v_class_id, 'Deutsch',    'D',  '#EF4444', 'Erlebnisaufsatz – Entwurf abgeben',             '2026-06-11', v_teacher_id),
    (v_class_id, 'Geschichte', 'GE', '#8B5CF6', 'Fragen zur Frühen Neuzeit S. 112–115',          '2026-06-13', v_teacher_id),
    (v_class_id, 'Englisch',   'E',  '#F59E0B', 'Vocabulary Unit 8 lernen + Übungen',            '2026-06-13', v_teacher_id),
    -- KW 25 (vergangen)
    (v_class_id, 'Mathematik', 'M', '#3B82F6', 'Textaufgaben S. 87 – Nr. 1–8',                 '2026-06-16', v_teacher_id),
    (v_class_id, 'Physik',     'PH', '#6366F1', 'Kräfte und Bewegung – Arbeitsblatt',            '2026-06-17', v_teacher_id),
    (v_class_id, 'Englisch',   'E',  '#F59E0B', 'Short Story lesen + Zusammenfassung',           '2026-06-18', v_teacher_id),
    (v_class_id, 'Deutsch',    'D',  '#EF4444', 'Gedichtanalyse „Erlkönig" (Goethe)',            '2026-06-19', v_teacher_id),
    (v_class_id, 'Geografie',  'GW', '#F97316', 'Klimazonen Lernblatt ausfüllen',               '2026-06-20', v_teacher_id),
    -- KW 26 (vergangen / heute)
    (v_class_id, 'Mathematik', 'M', '#3B82F6', 'Geometrie – Dreiecke & Kreise Übungsblatt',    '2026-06-23', v_teacher_id),
    (v_class_id, 'Englisch',   'E',  '#F59E0B', 'Grammar Unit 9 – Test-Vorbereitung',           '2026-06-25', v_teacher_id),
    (v_class_id, 'Biologie',   'BU', '#10B981', 'Pflanzen bestimmen – Fotos + Steckbriefe',      '2026-06-26', v_teacher_id),
    -- KW 27 (bevorstehend)
    (v_class_id, 'Deutsch',    'D',  '#EF4444', 'Textinterpretation „Die Verwandlung" S. 1–15', '2026-06-30', v_teacher_id),
    (v_class_id, 'Mathematik', 'M', '#3B82F6', 'Algebra – Prüfungsvorbereitung Kap. 6 & 7',    '2026-07-02', v_teacher_id);

END $$;


-- ── Erledigungsstände (streak-konform) ───────────────────────
--
-- Für einen Streak von N müssen die N aktuellsten vergangenen HÜ
-- LÜCKENLOS erledigt sein. Ältere HÜ können fehlen.
--
-- Streak-Tiers:
--   Streak 13: Pflanzen, Grammar, Geometrie, Klimazonen,
--              Gedicht, Short Story, Kräfte, Textaufg.,
--              Vocabulary, Fragen Neuzeit, Erlebnisaufsatz,
--              Ökosystem, Gleichungen
--   Streak 10: die 10 neuesten (#1–#10)
--   Streak  8: die 8 neuesten (#1–#8)
--   Streak  5: die 5 neuesten (#1–#5)
--   Streak  4: die 4 neuesten (#1–#4)
--   Streak  3: die 3 neuesten (#1–#3)
--   Streak  2: die 2 neuesten (#1–#2)
--   Streak  1: nur #1 (Pflanzen bestimmen)
--   Streak  0: #1 fehlt

INSERT INTO public.homework_completions (homework_id, student_id)
SELECT h.id, p.id
FROM public.homework h
JOIN public.profiles p
  ON p.class_id = h.class_id AND p.role = 'student'
WHERE h.class_id = (SELECT class_id FROM public.profiles WHERE role = 'teacher' LIMIT 1)
  AND (p.full_name, h.title) IN (

  -- ══ STREAK 13 ══════════════════════════════════════════════
  -- Lena Hofer – alle 13 vergangenen HÜ erledigt

  ('Lena Hofer', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Lena Hofer', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Lena Hofer', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Lena Hofer', 'Klimazonen Lernblatt ausfüllen'),
  ('Lena Hofer', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  ('Lena Hofer', 'Short Story lesen + Zusammenfassung'),
  ('Lena Hofer', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Lena Hofer', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Lena Hofer', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Lena Hofer', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('Lena Hofer', 'Erlebnisaufsatz – Entwurf abgeben'),
  ('Lena Hofer', 'Ökosystem Wald – Zusammenfassung schreiben'),
  ('Lena Hofer', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- Anna Schneider – alle 13 vergangenen HÜ erledigt

  ('Anna Schneider', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Anna Schneider', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Anna Schneider', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Anna Schneider', 'Klimazonen Lernblatt ausfüllen'),
  ('Anna Schneider', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  ('Anna Schneider', 'Short Story lesen + Zusammenfassung'),
  ('Anna Schneider', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Anna Schneider', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Anna Schneider', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Anna Schneider', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('Anna Schneider', 'Erlebnisaufsatz – Entwurf abgeben'),
  ('Anna Schneider', 'Ökosystem Wald – Zusammenfassung schreiben'),
  ('Anna Schneider', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 10 ══════════════════════════════════════════════
  -- Sophie Müller – #1–#10 erledigt, #11–#13 nicht (ältere Lücke)

  ('Sophie Müller', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Sophie Müller', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Sophie Müller', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Sophie Müller', 'Klimazonen Lernblatt ausfüllen'),
  ('Sophie Müller', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  ('Sophie Müller', 'Short Story lesen + Zusammenfassung'),
  ('Sophie Müller', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Sophie Müller', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Sophie Müller', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Sophie Müller', 'Fragen zur Frühen Neuzeit S. 112–115'),
  -- ältere HÜ: lücke bei Erlebnisaufsatz → streak bricht bei #11

  -- ══ STREAK 8 ═══════════════════════════════════════════════
  -- Mia Huber – #1–#8 erledigt

  ('Mia Huber', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Mia Huber', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Mia Huber', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Mia Huber', 'Klimazonen Lernblatt ausfüllen'),
  ('Mia Huber', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  ('Mia Huber', 'Short Story lesen + Zusammenfassung'),
  ('Mia Huber', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Mia Huber', 'Textaufgaben S. 87 – Nr. 1–8'),
  -- Vocabulary (#9) fehlt → streak bricht bei #9

  -- ══ STREAK 5 ═══════════════════════════════════════════════
  -- Emma Koch – #1–#5 erledigt

  ('Emma Koch', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Emma Koch', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Emma Koch', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Emma Koch', 'Klimazonen Lernblatt ausfüllen'),
  ('Emma Koch', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  -- Short Story (#6) fehlt → streak bricht bei #6
  -- Ältere HÜ trotzdem erledigt (Fleiß-Hintergrund):
  ('Emma Koch', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Emma Koch', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Emma Koch', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Emma Koch', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('Emma Koch', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- Lea Pichler – #1–#5 erledigt

  ('Lea Pichler', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Lea Pichler', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Lea Pichler', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Lea Pichler', 'Klimazonen Lernblatt ausfüllen'),
  ('Lea Pichler', 'Gedichtanalyse „Erlkönig" (Goethe)'),
  -- Short Story (#6) fehlt → streak bricht bei #6
  ('Lea Pichler', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Lea Pichler', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Lea Pichler', 'Erlebnisaufsatz – Entwurf abgeben'),
  ('Lea Pichler', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 4 ═══════════════════════════════════════════════
  -- Julia Maier – #1–#4 erledigt (knapp unter Meilenstein)

  ('Julia Maier', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Julia Maier', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Julia Maier', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Julia Maier', 'Klimazonen Lernblatt ausfüllen'),
  -- Gedichtanalyse (#5) fehlt → streak bricht bei #5
  ('Julia Maier', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Julia Maier', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Julia Maier', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Julia Maier', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 3 ═══════════════════════════════════════════════
  -- Felix Wagner – #1–#3 erledigt

  ('Felix Wagner', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Felix Wagner', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Felix Wagner', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  -- Klimazonen (#4) fehlt
  ('Felix Wagner', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Felix Wagner', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Felix Wagner', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('Felix Wagner', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 2 ═══════════════════════════════════════════════
  -- Lukas Fischer – #1–#2 erledigt

  ('Lukas Fischer', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  ('Lukas Fischer', 'Grammar Unit 9 – Test-Vorbereitung'),
  -- Geometrie (#3) fehlt
  ('Lukas Fischer', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Lukas Fischer', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Lukas Fischer', 'Erlebnisaufsatz – Entwurf abgeben'),
  ('Lukas Fischer', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 1 ═══════════════════════════════════════════════
  -- Jonas Gruber – nur #1 erledigt

  ('Jonas Gruber', 'Pflanzen bestimmen – Fotos + Steckbriefe'),
  -- Grammar (#2) fehlt
  ('Jonas Gruber', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Jonas Gruber', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Jonas Gruber', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Jonas Gruber', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  -- ══ STREAK 0 ═══════════════════════════════════════════════
  -- Folgende Schüler haben #1 (Pflanzen) NICHT erledigt → Streak 0
  -- Trotzdem einige ältere HÜ zur realistischen Darstellung

  ('Max Bauer', 'Grammar Unit 9 – Test-Vorbereitung'),
  ('Max Bauer', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Max Bauer', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Max Bauer', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Max Bauer', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  ('Noah Weber', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Noah Weber', 'Short Story lesen + Zusammenfassung'),
  ('Noah Weber', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Noah Weber', 'Textaufgaben S. 87 – Nr. 1–8'),

  ('Tim Steiner', 'Geometrie – Dreiecke & Kreise Übungsblatt'),
  ('Tim Steiner', 'Klimazonen Lernblatt ausfüllen'),
  ('Tim Steiner', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('Tim Steiner', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('Tim Steiner', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  ('Ben Lehner', 'Kräfte und Bewegung – Arbeitsblatt'),
  ('Ben Lehner', 'Vocabulary Unit 8 lernen + Übungen'),
  ('Ben Lehner', 'Erlebnisaufsatz – Entwurf abgeben'),
  ('Ben Lehner', 'Gleichungen Kap. 5 – Übungsaufgaben'),

  ('David Moser', 'Textaufgaben S. 87 – Nr. 1–8'),
  ('David Moser', 'Fragen zur Frühen Neuzeit S. 112–115'),
  ('David Moser', 'Gleichungen Kap. 5 – Übungsaufgaben')

)
ON CONFLICT DO NOTHING;
