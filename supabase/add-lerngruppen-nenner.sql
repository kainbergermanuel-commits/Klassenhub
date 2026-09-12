-- ============================================================
-- KlassenHub · Lerngruppen: Quote und Namensliste aus der HÜ selbst
-- ------------------------------------------------------------
-- Die Kontrollliste auf /gruppen bildete ihren Nenner aus den HEUTIGEN
-- Mitgliedern der Gruppe. Solange sich eine Gruppe nie ändert, ist das
-- dasselbe wie „wer hat die Hausübung bekommen" — sobald jemand dazukommt
-- oder ausscheidet, läuft es auseinander:
--
--   • Ein später aufgenommenes Kind erhöht den Nenner, obwohl es die
--     Hausübung nie bekommen hat. Die Zeile sah dauerhaft nach einer Lücke
--     aus und konnte nie „alle erledigt" erreichen.
--   • Ein ausgeschiedenes Kind, das die Hausübung noch hat, fehlte in der
--     Liste komplett — seine Abgabe zählte nirgends.
--
-- Ab hier kommen Nenner UND Namensliste aus der Hausübung selbst: die
-- Empfänger sind die Kinder der beteiligten Klassen ohne die Ausgenommenen
-- (excluded_student_ids). Genau die Rechnung, die lib/homeworkScope.ts auf
-- der Anwendungsseite für Klassenquoten längst macht.
--
-- Nebenbei wird die Abfrage KLEINER: die Mitgliedertabelle wird für die
-- Namensliste gar nicht mehr gebraucht.
--
-- Ändert keine Daten, nur zwei Funktionskörper. Idempotent.
-- Rollback: die Fassungen aus feature-lerngruppen.sql +
--           add-lerngruppen-schuljahr.sql erneut einspielen.
-- ============================================================

create or replace function public.group_homework(p_group uuid, p_since date default null)
returns table (
  batch_id uuid, title text, due_date date, details text,
  subject text, subject_short text, subject_color text,
  member_count int, done_count int, confirmed_count int
)
language sql stable security definer set search_path = public as $$
  with hw as (
    select distinct on (h.group_batch_id)
           h.group_batch_id, h.title, h.due_date, h.details,
           h.subject, h.subject_short, h.subject_color
      from public.homework h
     where h.group_id = p_group and h.group_batch_id is not null
       and (p_since is null or h.due_date >= p_since)
     order by h.group_batch_id, h.id
  ),
  -- Die tatsächlichen Empfänger je Hausübung: Kinder der beteiligten Klassen
  -- ohne die Ausgenommenen. Unabhängig davon, wie die Gruppe HEUTE aussieht.
  recipients as (
    select h.group_batch_id, p.id as student_id
      from public.homework h
      join public.profiles p
        on p.class_id = h.class_id
       and p.role = 'student'
       and not (p.id = any (coalesce(h.excluded_student_ids, '{}'::uuid[])))
     where h.group_id = p_group and h.group_batch_id is not null
  )
  select hw.group_batch_id, hw.title, hw.due_date, hw.details,
         hw.subject, hw.subject_short, hw.subject_color,
         (select count(*)::int from recipients r where r.group_batch_id = hw.group_batch_id),
         (select count(*)::int from public.homework_completions c
            join recipients r on r.student_id = c.student_id
                             and r.group_batch_id = hw.group_batch_id
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)),
         (select count(*)::int from public.homework_completions c
            join recipients r on r.student_id = c.student_id
                             and r.group_batch_id = hw.group_batch_id
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)
             and c.confirmed_by_parent_at is not null)
  from hw
  where public.can_lead_group(p_group)
  order by hw.due_date desc
$$;

-- Wer hat abgegeben? Namentlich, für EINE Gruppen-HÜ.
-- Ohne learning_group_members: wer die Hausübung hat, steht in ihr.
create or replace function public.group_homework_students(p_batch uuid)
returns table (
  student_id uuid, full_name text, class_name text,
  avatar_color text, avatar_seed text, avatar_hair_color text, avatar_skin_color text,
  done boolean, confirmed boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, c.name,
         p.avatar_color, p.avatar_seed, p.avatar_hair_color, p.avatar_skin_color,
         (co.student_id is not null),
         (co.confirmed_by_parent_at is not null)
    from public.homework h
    join public.profiles p
      on p.class_id = h.class_id
     and p.role = 'student'
     and not (p.id = any (coalesce(h.excluded_student_ids, '{}'::uuid[])))
    left join public.classes c on c.id = p.class_id
    left join public.homework_completions co
           on co.homework_id = h.id and co.student_id = p.id
   where h.group_batch_id = p_batch
     and public.can_manage_group_homework(p_batch)
   order by c.name, p.full_name
$$;

-- Kontrolle (als Lehrperson der Gruppe ausführen):
-- select * from public.group_homework('<GRUPPEN-UUID>', '2026-09-01');
