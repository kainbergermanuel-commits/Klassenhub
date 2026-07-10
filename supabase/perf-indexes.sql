-- ============================================================
-- KlassenHub · Performance-Indizes für die heißen Abfragepfade
-- ------------------------------------------------------------
-- Rein additiv (nur Lesegeschwindigkeit), keine Datenänderung, keine
-- Auswirkung auf RLS/Sicherheit. Idempotent. Im Supabase SQL-Editor
-- ausführen. Wirkt v.a. auf Startseite + Nav-Badges, deren Abfragen
-- bisher ganze Tabellen scannen mussten.
-- ============================================================

-- homework_completions wird oft nach student_id allein gefiltert
-- (eigene Erledigungen, HÜ-Badge). PK ist (homework_id, student_id),
-- deckt student_id allein NICHT ab → eigener Index.
create index if not exists homework_completions_student_idx
  on public.homework_completions (student_id);

-- homework wird überall nach Klasse + Fälligkeit gefiltert/sortiert.
create index if not exists homework_class_due_idx
  on public.homework (class_id, due_date);

-- profiles: Schüler-/Elternlisten je Klasse werden auf fast jeder Seite geladen.
create index if not exists profiles_class_role_idx
  on public.profiles (class_id, role);

-- reminders: Startseiten-Agenda + Erinnerungs-Badge (Klasse + Datum).
create index if not exists reminders_class_date_idx
  on public.reminders (class_id, event_date);

-- duties: Wochendienste je Klasse + Woche (Startseite).
create index if not exists duties_class_week_idx
  on public.duties (class_id, week_start);
