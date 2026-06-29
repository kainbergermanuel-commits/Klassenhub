-- ============================================================
-- Cleanup: tote Spalte profiles.subjects entfernen
-- ------------------------------------------------------------
-- Hintergrund: subjects wurde mit add-teacher-class-subjects.sql
-- nach teacher_classes.subjects verschoben ("statt global in
-- profiles.subjects"). Die alte Spalte wird seither nirgends mehr
-- gelesen oder geschrieben – sie enthält nur noch den leeren
-- Default '[]'::jsonb aus add-teacher-subjects.sql.
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

alter table public.profiles drop column if exists subjects;
