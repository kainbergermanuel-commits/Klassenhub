-- ============================================================
-- KlassenHub · Fix: Eltern konnten die Dienst-Bestätigungen ihres Kindes
--                   gar nicht lesen
-- ------------------------------------------------------------
-- BEFUND: public.duty_completions kennt drei Policies — duty_completions_own
-- (Kind, student_id = auth.uid()), duty_completions_teacher_read und
-- duty_completions_admin_all. Für Eltern gibt es KEINE. Die Startseite fragt
-- im Eltern-Zweig aber genau diese Tabelle ab und leitet daraus die Karte
-- "Dienst diese Woche" im ChildStatsPanel ab. Ohne Policy liefert die Abfrage
-- stumm null Zeilen: die Karte meldete Eltern dauerhaft "Der Dienst dieser
-- Woche ist noch nicht an allen Tagen abgehakt", egal was das Kind getan hat.
-- Seit die Dienste-Seite den Stand des Kindes anzeigt, träfe sie dasselbe.
--
-- FIX: Lese-Policy für Eltern auf das eigene Kind, nach demselben Muster wie
-- homework_extensions_parent_read (feature-hw-extension.sql) und
-- attendance_parent_read (feature-anwesenheit.sql). Nur SELECT — bestätigen
-- darf weiterhin ausschließlich das Kind selbst (SDT-Autonomie).
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

drop policy if exists "duty_completions_parent_read" on public.duty_completions;
create policy "duty_completions_parent_read" on public.duty_completions
  for select to authenticated
  using (
    student_id = (select child_id from public.profiles where id = auth.uid() and role = 'parent')
  );
