-- ============================================================
-- KlassenHub · Planung gehört der Lehrperson, nicht der Klasse
-- ------------------------------------------------------------
-- Die Planung war bisher ein Dokument der KLASSE: Schlüssel
-- (class_id, week_start, day, subject), lesbar und beschreibbar für jede
-- Lehrperson dieser Klasse. Gemeint war sie aber immer als persönliches
-- Werkzeug — „was mache ich heute, morgen?". Daraus folgten zwei Ärgernisse:
--
--   1. Die eigene Planung war nur sichtbar, wenn gerade die richtige Klasse
--      aktiv war. Auf der Startseite stand der persönliche Stundenplan (über
--      ALLE Klassen) neben Notizen einer einzigen Klasse.
--   2. Eine zweite Lehrperson derselben Klasse konnte die Planung lesen und
--      überschreiben, ohne dass die Oberfläche das je angekündigt hätte.
--
-- Ab hier gehört eine Notiz ihrer Autorin. Der Schlüssel ist
-- (author_id, week_start, day, subject); class_id entfällt. Welche Klasse
-- gemeint ist, steht künftig im Text der Notiz — bewusst so entschieden:
-- Stichworte genügen, und die Lehrperson formuliert sie ohnehin präzise.
--
-- Das macht das Feature KLEINER, nicht grösser: die Policy braucht keine
-- Unterabfrage mehr (my_class_ids()), die Abfragen keinen Klassenbezug, und
-- die Seite hängt nicht mehr am Klassenumschalter.
--
-- Bestand: geprüft am 2026-09-12 an der Live-Datenbank — 17 Notizen, KEINE
-- Kollision beim neuen Schlüssel. Die Zeilen wandern also unverändert mit,
-- nur die Klassenzuordnung geht verloren (sie wird nicht mehr gebraucht).
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- Rollback: rollback-planung-persoenlich.sql
-- ============================================================

-- ---- 1) Sicherheitsnetz: gäbe es doch Kollisionen, brich ab ----
-- Zwei Notizen derselben Lehrperson in derselben Woche, am selben Tag, im
-- selben Fach (aus zwei Klassen) könnten nicht beide bestehen bleiben. Lieber
-- hier abbrechen als eine davon stillschweigend verlieren.
do $$
declare v_dupes int;
begin
  select count(*) into v_dupes from (
    select author_id, week_start, day, subject
    from public.planning_notes
    group by author_id, week_start, day, subject
    having count(*) > 1
  ) x;
  if v_dupes > 0 then
    raise exception 'Abbruch: % Schlüssel wären doppelt. Erst die betroffenen Notizen zusammenführen.', v_dupes;
  end if;
end $$;

-- ---- 2) Schlüssel umstellen --------------------------------
alter table public.planning_notes
  drop constraint if exists planning_notes_class_id_week_start_day_subject_key;

create unique index if not exists planning_notes_author_key
  on public.planning_notes (author_id, week_start, day, subject);

drop index if exists public.planning_notes_class_week_idx;
create index if not exists planning_notes_author_week_idx
  on public.planning_notes (author_id, week_start);

-- ---- 3) Klassenbezug entfernen -----------------------------
alter table public.planning_notes drop column if exists class_id;

-- ---- 4) Policies -------------------------------------------
-- Ohne Unterabfrage: die Zeile gehört mir oder nicht.
drop policy if exists "planning_teacher_all" on public.planning_notes;
create policy "planning_own_all" on public.planning_notes
  for all to authenticated
  using (author_id = (select auth.uid()) and public.is_teacher())
  with check (author_id = (select auth.uid()) and public.is_teacher());

-- Admin-Policy unverändert lassen, falls vorhanden; sonst hier anlegen.
drop policy if exists "planning_admin_all" on public.planning_notes;
create policy "planning_admin_all" on public.planning_notes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- Kontrolle ---------------------------------------------
-- select author_id, count(*) from public.planning_notes group by author_id;
