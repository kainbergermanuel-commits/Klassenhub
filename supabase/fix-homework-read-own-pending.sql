-- ============================================================
-- KlassenHub · Eigene Einreichungen sichtbar machen
-- ------------------------------------------------------------
-- Bisher gab homework_read Nicht-Lehrpersonen nur `published` frei. Eine
-- Schülerin mit der Spezialrolle hw_admin hat ihre HÜ eingetragen, die
-- Bestätigung "Wird zuerst von der Lehrperson bestätigt" gelesen — und
-- danach war der Eintrag spurlos verschwunden, bis die Lehrkraft ihn
-- freigab. Kein Status, keine Rückmeldung, kein Nachschauen.
--
-- Die Klassengrenze bleibt unverändert bestehen; die neue Klausel weitet den
-- Zugriff ausschließlich auf EIGENE Zeilen innerhalb der EIGENEN Klasse aus.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- ============================================================

drop policy if exists "homework_read" on public.homework;
create policy "homework_read" on public.homework for select to authenticated
  using (
    class_id in (select public.my_class_ids())
    and (
      status = 'published'
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      or created_by = auth.uid()
    )
  );
