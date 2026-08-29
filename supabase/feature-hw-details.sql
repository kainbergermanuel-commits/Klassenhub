-- ============================================================
-- KlassenHub · Hausübungs-Details
-- ------------------------------------------------------------
-- Optionales Freitextfeld zu einer Hausübung: was genau ist zu tun, welche
-- Seite, welche Nummern, was mitzubringen ist. Der Titel bleibt die kurze
-- Zeile für die Listen ("Übungsblatt S. 42"), die Details tragen den Rest.
--
-- Keine RLS-Änderung nötig: die Spalte fällt unter die bestehenden
-- homework-Policies (lesen alle Klassenmitglieder, schreiben Lehrpersonen
-- und hw_admin beim Anlegen).
--
-- Länge wird anwendungsseitig auf 500 Zeichen begrenzt (Eingabefelder),
-- bewusst kein CHECK in der DB — eine spätere Lockerung soll keine
-- Migration brauchen, und ein abgeschnittener Text wäre schlimmer als ein
-- etwas längerer.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- ============================================================

alter table public.homework
  add column if not exists details text;
