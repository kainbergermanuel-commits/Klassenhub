-- ============================================================
-- Seed: Streak-Meilensteine bestätigen
--
-- Bestätigt alle verdienten Meilensteine (je 5 HÜ) für Schüler
-- mit Streak ≥ 5. Die Bestätigung erfolgt durch den Lehrer
-- (stellvertretend für Eltern im Demo-Betrieb).
--
-- Erwartete Meilensteine nach seed-homework.sql:
--   Lena Hofer       Streak 13 → Meilenstein 5 + 10
--   Anna Schneider   Streak 13 → Meilenstein 5 + 10
--   Sophie Müller    Streak 10 → Meilenstein 5 + 10
--   Mia Huber        Streak  8 → Meilenstein 5
--   Emma Koch        Streak  5 → Meilenstein 5
--   Lea Pichler      Streak  5 → Meilenstein 5
--
-- Idempotent: ON CONFLICT DO NOTHING
-- Im Supabase SQL-Editor ausführen (nach seed-homework.sql).
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

  -- Alle vorhandenen Bestätigungen für diese Klasse löschen
  DELETE FROM public.streak_confirmations
   WHERE student_id IN (
     SELECT id FROM public.profiles
      WHERE class_id = v_class_id AND role = 'student'
   );

  -- Neue Bestätigungen einfügen
  -- confirmed_at-Zeitstempel entsprechen realistischen Bestätigungszeitpunkten:
  --   Meilenstein 5  → ca. kurz nach dem 5. HÜ (um den 13. Juni)
  --   Meilenstein 10 → ca. kurz nach dem 10. HÜ (um den 20. Juni)

  INSERT INTO public.streak_confirmations (student_id, milestone, confirmed_by, confirmed_at)
  SELECT p.id, m.milestone, v_teacher_id, m.confirmed_at::timestamptz
  FROM public.profiles p
  CROSS JOIN (VALUES
    -- Meilenstein 5 für: Lena, Anna, Sophie, Mia, Emma, Lea
    ('Lena Hofer',      5,  '2026-06-14 18:32:00+02'),
    ('Lena Hofer',     10,  '2026-06-21 09:15:00+02'),
    ('Anna Schneider',  5,  '2026-06-14 20:05:00+02'),
    ('Anna Schneider', 10,  '2026-06-21 11:47:00+02'),
    ('Sophie Müller',   5,  '2026-06-15 17:20:00+02'),
    ('Sophie Müller',  10,  '2026-06-22 16:03:00+02'),
    ('Mia Huber',       5,  '2026-06-16 19:44:00+02'),
    ('Emma Koch',       5,  '2026-06-20 21:10:00+02'),
    ('Lea Pichler',     5,  '2026-06-20 22:30:00+02')
  ) AS m(full_name, milestone, confirmed_at)
  WHERE p.class_id = v_class_id
    AND p.role = 'student'
    AND p.full_name = m.full_name
  ON CONFLICT DO NOTHING;

END $$;
