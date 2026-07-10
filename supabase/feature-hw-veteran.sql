-- ============================================================
-- KlassenHub · HÜ-Veteran (automatische Bestätigung ab Meilenstein 15)
-- ------------------------------------------------------------
-- Kein neues Schema nötig: "Veteran" wird aus streak_confirmations
-- abgeleitet (milestone >= 15, dauerhaft — auch nach gerissener Streak).
-- Diese Migration härtet nur die bestehende RLS-Policy, damit Schüler
-- confirmed_by_parent_at NIE selbst direkt setzen können (bisher nicht
-- ausgenutzt, aber technisch möglich, da die Policy keine Spalten
-- einschränkte). Die Auto-Bestätigung für Veteranen läuft serverseitig
-- mit dem Service-Role-Key (app/actions/toggleHomeworkCompletion.ts).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

drop policy if exists "completions_student_write" on public.homework_completions;
create policy "completions_student_write" on public.homework_completions for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and confirmed_by_parent_at is null
    and exists (select 1 from public.homework h where h.id = homework_id and h.class_id = public.my_class_id())
  );
