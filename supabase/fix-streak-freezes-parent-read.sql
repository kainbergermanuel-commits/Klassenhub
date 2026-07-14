-- ============================================================
-- Fix: Eltern konnten streak_freezes ihres Kindes nicht lesen
-- ------------------------------------------------------------
-- confirmHomeworkCompletion.ts berechnet bei einer Eltern-Bestätigung, ob
-- ein Meilenstein (5/10/15/20) neu erreicht wurde — dafür muss die Server-
-- Action auch überbrückte (Joker-)Lücken des Kindes kennen, sonst könnte ein
-- durch den Joker überbrücktes Loch einen tatsächlich erreichten Meilenstein
-- verdecken. streak_freezes hatte bislang nur Policies für Schüler:in selbst,
-- Lehrer und Admin — keine für Eltern. Gleiches Muster wie
-- add-hw-parent-confirmation.sql. Idempotent, additiv. Im SQL-Editor ausführen.
-- ============================================================

drop policy if exists "streak_freezes_parent_read" on public.streak_freezes;
create policy "streak_freezes_parent_read" on public.streak_freezes
  for select to authenticated
  using (
    student_id = (select child_id from public.profiles where id = auth.uid() and role = 'parent')
  );
