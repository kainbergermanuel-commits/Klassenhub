-- ============================================================
-- KlassenHub · Selbstbestätigung unterbinden
-- ------------------------------------------------------------
-- PROBLEM: completions_student_write war `for all` mit
-- `using (student_id = auth.uid())`. Postgres-RLS wirkt auf ZEILEN, nicht auf
-- Spalten — die Policy erlaubte damit auch UPDATE auf confirmed_by_parent_at.
-- Ein `.update({ confirmed_by_parent_at: ... })` aus der Browser-Konsole
-- hätte alle eigenen Erledigungen selbst bestätigt und damit Flamme,
-- Klassenziel und Leaderboard verfälscht. Der Kommentar in
-- toggleHomeworkCompletion.ts („RLS verbietet Schülern explizit …")
-- beschrieb eine Absicht, die so nie umgesetzt war.
--
-- LÖSUNG: getrennte Policies für INSERT und DELETE. Für Schüler:innen gibt es
-- danach GAR KEINE UPDATE-Policy mehr — damit ist der Weg zu
-- confirmed_by_parent_at zu, ohne dass eine Spaltenprüfung nötig wäre.
-- Die Klassenprüfung aus fix-hardening.sql bleibt unverändert erhalten.
--
-- ⚠️ REIHENFOLGE: Diese Migration setzt voraus, dass
-- app/actions/toggleHomeworkCompletion.ts bereits
-- `.upsert(..., { ignoreDuplicates: true })` verwendet (seit 2026-08 der Fall).
-- Der Standard-Upsert erzeugt `ON CONFLICT DO UPDATE` und BRAUCHT
-- UPDATE-Rechte; wird die Policy vor der Code-Änderung eingespielt, können
-- Kinder nichts mehr abhaken.
--
-- Weiterhin möglich (bewusst unberührt geprüft):
--   • Abhaken                    → INSERT (unten)
--   • Häkchen entfernen          → DELETE (unten)
--   • Eltern bestätigen          → parents_confirm_child_hw_completion
--   • Veteranen-Autobestätigung  → Service-Client, umgeht RLS
--   • Lesen (Klasse/Leaderboard) → completions_read / completions_class_read
--
-- BEWUSST NICHT MIT ERLEDIGT: Auch die Eltern-Policy hat keine
-- Spaltenbeschränkung, ein Elternteil könnte theoretisch completed_at des
-- eigenen Kindes verändern. Das wäre nur per Trigger zu schließen, und ein
-- Trigger auf dieser Tabelle liegt direkt im Pfad der Eltern-Bestätigung —
-- also im Kernablauf des Systems. Die Tragweite steht in keinem Verhältnis
-- zu diesem Risiko: Eltern sind hier die vertrauenswürdige Instanz, und die
-- eigentliche Lücke (das Kind bestätigt sich selbst) ist oben geschlossen.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- ============================================================

drop policy if exists "completions_student_write" on public.homework_completions;

drop policy if exists "completions_student_insert" on public.homework_completions;
create policy "completions_student_insert" on public.homework_completions
  for insert to authenticated
  with check (
    student_id = auth.uid()
    and exists (
      select 1 from public.homework h
      where h.id = homework_id
        and h.class_id in (select public.my_class_ids())
    )
  );

drop policy if exists "completions_student_delete" on public.homework_completions;
create policy "completions_student_delete" on public.homework_completions
  for delete to authenticated
  using (student_id = auth.uid());
