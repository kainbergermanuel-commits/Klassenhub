-- ============================================================
-- KlassenHub · Gruppen-Hausübung: einzelne Mitglieder abwählen
-- ------------------------------------------------------------
-- Bisher ging eine Gruppen-Hausübung immer an die ganze Gruppe. Wie bei einer
-- Klassen-HÜ soll sich im Einzelfall jemand abwählen lassen (krank, anderes
-- Programm, individuelle Aufgabe) — bewusst als ABWAHL, nicht als Zuteilung:
-- der Normalfall ist „alle", und niemand soll acht Kinder anklicken müssen,
-- damit sieben eine Aufgabe bekommen. Gleiche Richtung wie
-- homework.excluded_student_ids (siehe add-homework-exclusions.sql).
--
-- Nur beim ANLEGEN. Nachträglich Empfänger zu ändern wäre etwas anderes: dann
-- stellte sich die Frage, was mit einer bereits erfolgten Abgabe passiert.
-- Bewusst offen gelassen, weil es im Alltag praktisch nicht vorkommt.
--
-- Ändert keine Daten, nur einen Funktionskörper. Idempotent.
-- Rollback: Fassung aus feature-lerngruppen.sql erneut einspielen.
-- ============================================================

-- Alte Fassung ohne den Parameter entfernen, sonst gäbe es zwei Überladungen.
drop function if exists public.create_group_homework(uuid, text, date, text);

create or replace function public.create_group_homework(
  p_group    uuid,
  p_title    text,
  p_due      date,
  p_details  text default null,
  -- Mitglieder, die DIESE Hausübung ausnahmsweise nicht bekommen.
  p_excluded uuid[] default '{}'::uuid[]
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_batch uuid := gen_random_uuid();
  v_group public.learning_groups%rowtype;
  v_rows  int := 0;
begin
  if not public.can_lead_group(p_group) then
    raise exception 'Keine Berechtigung für diese Lerngruppe';
  end if;
  select * into v_group from public.learning_groups where id = p_group;
  if not found then raise exception 'Lerngruppe nicht gefunden'; end if;
  if v_group.archived then raise exception 'Lerngruppe ist archiviert'; end if;

  -- Eine Zeile je beteiligter Klasse. excluded_student_ids = alle Kinder
  -- dieser Klasse AUSSER den teilnehmenden Gruppenmitgliedern; damit ist die
  -- Zeile für jeden bestehenden Codepfad eine ganz normale HÜ mit Ausnahmen.
  insert into public.homework (
    class_id, subject, subject_short, subject_color, title, due_date, details,
    created_by, status, excluded_student_ids, group_id, group_batch_id, group_label
  )
  select
    k.class_id, v_group.subject, v_group.subject_short, v_group.subject_color,
    p_title, p_due, nullif(btrim(coalesce(p_details, '')), ''),
    auth.uid(), 'published',
    -- Leeres Ergebnis (alle Kinder der Klasse nehmen teil) wird zu NULL:
    -- "gilt für alle" ist in der Datenbank NULL, damit die Lesepolicy den
    -- billigen Weg nimmt. Gleiche Konvention wie im Hausübungs-Formular.
    nullif(
      (select coalesce(array_agg(s.id), '{}'::uuid[])
         from public.profiles s
        where s.class_id = k.class_id and s.role = 'student'
          and (
            -- kein Gruppenmitglied …
            s.id not in (select student_id from public.learning_group_members where group_id = p_group)
            -- … oder für diese eine Hausübung abgewählt
            or s.id = any (coalesce(p_excluded, '{}'::uuid[]))
          )),
      '{}'::uuid[]),
    p_group, v_batch, v_group.name
  from (
    -- Nur Klassen, aus denen auch tatsächlich jemand teilnimmt: sind alle
    -- Kinder einer Klasse abgewählt, entsteht für sie gar keine Zeile.
    select distinct p.class_id
    from public.learning_group_members m
    join public.profiles p on p.id = m.student_id
    where m.group_id = p_group and p.class_id is not null
      and not (m.student_id = any (coalesce(p_excluded, '{}'::uuid[])))
  ) k;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'Es bleibt kein Kind übrig, das diese Hausübung bekommen würde';
  end if;
  return v_batch;
end;
$$;
