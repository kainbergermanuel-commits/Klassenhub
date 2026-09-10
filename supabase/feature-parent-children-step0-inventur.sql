-- ============================================================
-- ClassHaven · Ein Elternkonto, mehrere Kinder — STUFE 0: Inventur
-- ------------------------------------------------------------
-- Ändert NICHTS. Reine Leseabfrage.
--
-- Zweck: die verbindliche Arbeitsliste für Stufe 3 erzeugen. Die
-- Migrationsdateien im Repo sind nicht zwingend der Live-Stand,
-- spätere Fixes können Policies überschrieben haben.
--
-- Gesucht wird nach DREI Mustern, nicht nur nach child_id:
--   1) child_id  → die Kind-Einschränkung, die auf IN umgestellt wird
--   2) class_id  → Klassenprüfungen, die NICHT über my_class_ids()
--                  laufen, sondern inline. Die erreicht die Erweiterung
--                  von my_class_ids() nicht.
--   3) "is null" → Rückfallpfade. Sie schalten bei fehlender
--                  Verknüpfung auf "alle Kinder der Klasse" um und
--                  sind der Grund, warum profiles.child_id NICHT
--                  einfach abgebaut werden darf.
--
-- Ergebnis vollständig zurückgeben.
-- ============================================================

SELECT
  c.relname                                   AS tabelle,
  p.polname                                   AS policy,
  CASE p.polcmd WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
                WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE'
                ELSE 'ALL' END                AS befehl,
  pg_get_expr(p.polqual,      p.polrelid)     AS using_ausdruck,
  pg_get_expr(p.polwithcheck, p.polrelid)     AS check_ausdruck,
  -- Einordnung fürs Auge
  (pg_get_expr(p.polqual, p.polrelid)      ILIKE '%child_id%'
   OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%child_id%')  AS trifft_child_id,
  (pg_get_expr(p.polqual, p.polrelid)      ILIKE '%is null%'
   OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%is null%')   AS hat_rueckfallpfad,
  (pg_get_expr(p.polqual, p.polrelid)      ILIKE '%my_class_ids%'
   OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%my_class_ids%') AS nutzt_my_class_ids
FROM pg_policy p
JOIN pg_class c     ON c.oid = p.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND (
        pg_get_expr(p.polqual,      p.polrelid) ILIKE '%child_id%'
     OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%child_id%'
     OR pg_get_expr(p.polqual,      p.polrelid) ILIKE '%class_id%'
     OR pg_get_expr(p.polwithcheck, p.polrelid) ILIKE '%class_id%'
  )
ORDER BY trifft_child_id DESC, hat_rueckfallpfad DESC, c.relname, p.polname;
