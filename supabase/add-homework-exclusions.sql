-- ============================================================
-- KlassenHub · Einzelne Kinder von einer Hausübung ausnehmen
-- ------------------------------------------------------------
-- Bisher ging jede veröffentlichte HÜ automatisch an die ganze Klasse. Kinder,
-- die in einem Fach gesondert unterrichtet werden, bekamen sie trotzdem — in
-- der Liste, im Badge, und vor allem in der Streak-Rechnung, wo sie als
-- versäumt zählte.
--
-- Bewusst AUSNAHME statt Zuteilung, anders als `reminders.target_student_ids`:
--   NULL / leer  = die HÜ gilt für alle (der Normalfall)
--   Array gesetzt = alle AUSSER diesen Kindern
-- Drei Gründe für diese Richtung:
--   1. Sie entspricht der Wirklichkeit. Eine HÜ geht an alle bis auf wenige,
--      eine Erinnerung gezielt an wenige. Mit einer Zuteilungs-Liste müsste
--      man 15 Kinder anklicken, damit eines keine HÜ bekommt.
--   2. NULL als Standard heisst: jede bestehende Zeile und jeder heutige
--      Codepfad bleiben unverändert richtig. Rückwärtskompatibel per Bauart.
--   3. Robust gegen Klassenzugänge. Ein Kind, das im November dazukommt,
--      bekommt die laufenden HÜ automatisch, ohne dass jemand ein Array
--      nachpflegt. Bei einer Zuteilungs-Liste wäre es stumm aussen vor.
--
-- Datenschutz: Der Grund der Ausnahme (etwa ein sonderpädagogischer
-- Förderbedarf) wird NIRGENDS gespeichert. Weder als Spalte noch als Flag am
-- Kind. Die Datenbank kennt nur "bei dieser einen Hausübung nicht dabei", und
-- die RLS unten sorgt dafür, dass andere Kinder die Zeile gar nicht erst
-- sehen — sonst stünde in jeder HÜ lesbar, wer ausgenommen ist.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- ============================================================

-- ---- 1) Spalte ---------------------------------------------
alter table public.homework
  add column if not exists excluded_student_ids uuid[];

comment on column public.homework.excluded_student_ids is
  'NULL = gilt für alle. Sonst: alle Kinder der Klasse AUSSER diesen. Nie den Grund der Ausnahme hier ablegen.';

-- Bewusst KEIN GIN-Index. Die Abfragen suchen immer erst über
-- homework_class_due_idx (class_id, due_date) und filtern danach ein paar
-- hundert Zeilen. Ein Array-Index käme nie zum Zug und würde nur jeden
-- Schreibvorgang verteuern.


-- ---- 2) Helfer: auf welches Kind ist mein Konto bezogen? ----
-- Schüler:in → die eigene id, Elternteil → das verknüpfte Kind, sonst NULL.
--
-- Warum ein Helfer und nicht wie in add-reminder-targets.sql ein EXISTS in der
-- Policy: dort referenziert das EXISTS das Array der jeweiligen Zeile, ist
-- damit korreliert und läuft einmal PRO ZEILE. Bei Erinnerungen mit limit(8)
-- fällt das nie auf, bei HÜ über ein ganzes Schuljahr wären es einige hundert
-- Lookups. STABLE + unkorreliert macht daraus einen InitPlan, der einmal pro
-- Abfrage ausgewertet wird.
--
-- SECURITY DEFINER wie my_class_id()/my_class_ids(): der Zugriff auf profiles
-- darf hier keine RLS-Rekursion auslösen.
create or replace function public.my_student_id()
returns uuid language sql stable security definer
set search_path = public as $$
  select case role
           when 'student' then id
           when 'parent'  then child_id
         end
  from public.profiles
  where id = auth.uid()
$$;


-- ---- 3) Lesepolicy ------------------------------------------
-- Erweitert die zuletzt gültige Fassung aus fix-homework-read-own-pending.sql
-- um genau einen zusätzlichen AND-Block. Der bisherige Teil (Klassengrenze,
-- published, Lehrpersonen sehen alles, eigene pending-Einreichung bleibt
-- sichtbar) ist unverändert, nur auf die vorhandenen Helfer is_teacher() und
-- die (select auth.uid())-Schreibweise umgestellt.
--
-- (select auth.uid()) statt auth.uid(): bar hingeschrieben wertet Postgres die
-- Funktion pro Zeile neu aus, in Klammern als Subquery wird ein InitPlan
-- daraus. Verhaltensgleich, nur billiger.
--
-- Randfall, bewusst so entschieden: Nimmt eine Lehrperson ausgerechnet das
-- Kind aus, das die HÜ selbst als hw_admin eingereicht hat, gewinnt die
-- Ausnahme und die Zeile verschwindet auch für dieses Kind. Die Ausnahme ist
-- die spätere und ausdrücklichere Entscheidung.
drop policy if exists "homework_read" on public.homework;
create policy "homework_read" on public.homework for select to authenticated
  using (
    class_id in (select public.my_class_ids())
    and (
      status = 'published'
      or public.is_teacher()
      or created_by = (select auth.uid())
    )
    and (
      -- Lehrpersonen sehen immer alles, auch die Ausnahmen selbst.
      public.is_teacher()
      -- Der Normalfall: gilt für alle.
      or excluded_student_ids is null
      -- Konten ohne Kindbezug (Admin ohne Lehrerrolle) trifft die Ausnahme nicht.
      or public.my_student_id() is null
      -- Schüler:in bzw. Elternteil: nur, wenn das Kind nicht ausgenommen ist.
      or not (public.my_student_id() = any (excluded_student_ids))
    )
  );


-- ---- Rollback ----------------------------------------------
-- Falls etwas klemmt, stellt dieser Block den Stand von vorher wieder her.
-- Die Spalte darf stehen bleiben, ohne Policy wirkt sie nirgends.
--
-- drop policy if exists "homework_read" on public.homework;
-- create policy "homework_read" on public.homework for select to authenticated
--   using (
--     class_id in (select public.my_class_ids())
--     and (
--       status = 'published'
--       or exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
--       or created_by = auth.uid()
--     )
--   );
