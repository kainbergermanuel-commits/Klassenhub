-- ============================================================
-- KlassenHub · Lerngruppen: Schuljahresgrenze + ein Aufruf statt zwei
-- ------------------------------------------------------------
-- Zwei Nachbesserungen an feature-lerngruppen.sql:
--
-- 1) group_homework() lud ALLE Hausübungen der Gruppe, ohne Grenze. Überall
--    sonst begrenzt die App auf das laufende Schuljahr (siehe die
--    gte('due_date', schoolYearStart)-Filter in app/); im zweiten Jahr stünde
--    auf /gruppen sonst alles seit Anfang. Neuer Parameter p_since: NULL =
--    alles (Rückwärtskompatibilität), sonst ab diesem Datum.
--
-- 2) group_overview() bündelt Mitglieder und Hausübungen in EINER Antwort.
--    Die Karte holte beides mit zwei Aufrufen; das Bündel ruft schlicht die
--    beiden bestehenden Funktionen auf, dupliziert also keine Logik — und
--    erbt damit auch ihre Berechtigungsprüfungen.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- Rollback: siehe unten (auskommentiert)
-- ============================================================

-- Alte Fassung mit nur einem Parameter entfernen, sonst gäbe es zwei
-- Überladungen mit gleichem Namen und PostgREST müsste raten.
drop function if exists public.group_homework(uuid);

create or replace function public.group_homework(p_group uuid, p_since date default null)
returns table (
  batch_id uuid, title text, due_date date, details text,
  subject text, subject_short text, subject_color text,
  member_count int, done_count int, confirmed_count int
)
language sql stable security definer set search_path = public as $$
  with mem as (
    select student_id from public.learning_group_members where group_id = p_group
  ), hw as (
    select distinct on (h.group_batch_id)
           h.group_batch_id, h.title, h.due_date, h.details,
           h.subject, h.subject_short, h.subject_color
      from public.homework h
     where h.group_id = p_group and h.group_batch_id is not null
       and (p_since is null or h.due_date >= p_since)
     order by h.group_batch_id, h.id
  )
  select hw.group_batch_id, hw.title, hw.due_date, hw.details,
         hw.subject, hw.subject_short, hw.subject_color,
         (select count(*)::int from mem),
         (select count(*)::int from public.homework_completions c
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)
             and c.student_id in (select student_id from mem)),
         (select count(*)::int from public.homework_completions c
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)
             and c.student_id in (select student_id from mem)
             and c.confirmed_by_parent_at is not null)
  from hw
  where public.can_lead_group(p_group)
  order by hw.due_date desc
$$;

-- Mitglieder + Hausübungen in einer Antwort. Ruft die bestehenden Funktionen
-- auf, statt ihre Abfragen zu wiederholen: eine Quelle, eine Prüfung.
create or replace function public.group_overview(p_group uuid, p_since date default null)
returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'members',  coalesce((select jsonb_agg(to_jsonb(m)) from public.group_members(p_group) m), '[]'::jsonb),
    'homework', coalesce((select jsonb_agg(to_jsonb(h)) from public.group_homework(p_group, p_since) h), '[]'::jsonb)
  )
$$;

-- Rollback:
-- drop function if exists public.group_overview(uuid, date);
-- drop function if exists public.group_homework(uuid, date);
-- (danach die Fassung aus feature-lerngruppen.sql erneut einspielen)
