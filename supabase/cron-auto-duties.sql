-- Automatische Dienst-Zuweisung jeden Sonntag um 06:00 Uhr (Vienna-Zeit = 04:00 UTC)
-- Läuft für jede Klasse und verteilt die Standard-Dienste zufällig auf die Schüler.
-- Voraussetzung: pg_cron Extension muss in Supabase aktiviert sein (Database → Extensions → pg_cron)

-- 1. Hilfsfunktion: Schüler zufällig auf Dienste einer Klasse verteilen
create or replace function assign_duties_for_class(p_class_id uuid, p_week_start date)
returns void language plpgsql as $$
declare
  v_duties text[] := array[
    'Tafel wischen',
    'Boden säubern',
    'Lüften',
    'Blumen gießen',
    'Ordner austeilen',
    'Müll entleeren'
  ];
  v_students uuid[];
  v_shuffled uuid[];
  v_duty text;
  v_i int;
  v_pick1 uuid;
  v_pick2 uuid;
begin
  -- Schüler der Klasse laden
  select array_agg(id order by random())
  into v_shuffled
  from profiles
  where class_id = p_class_id and role = 'student';

  if v_shuffled is null or array_length(v_shuffled, 1) = 0 then
    return;
  end if;

  -- Je 2 Schüler pro Dienst (zyklisch falls weniger als 12 Schüler)
  for v_i in 1..array_length(v_duties, 1) loop
    v_duty := v_duties[v_i];
    v_pick1 := v_shuffled[((v_i * 2 - 2) % array_length(v_shuffled, 1)) + 1];
    v_pick2 := v_shuffled[((v_i * 2 - 1) % array_length(v_shuffled, 1)) + 1];

    insert into duties (class_id, week_start, duty_name, assignee_ids, created_by)
    values (p_class_id, p_week_start, v_duty, array[v_pick1, v_pick2], null)
    on conflict (class_id, week_start, duty_name) do nothing;
  end loop;
end;
$$;

-- 2. Haupt-Job-Funktion: alle Klassen durchlaufen
create or replace function auto_assign_weekly_duties()
returns void language plpgsql as $$
declare
  v_class record;
  v_next_monday date := date_trunc('week', now() + interval '1 day')::date;
begin
  for v_class in select id from classes loop
    perform assign_duties_for_class(v_class.id, v_next_monday);
  end loop;
end;
$$;

-- 3. Cron-Job: jeden Sonntag um 04:00 UTC (= 06:00 Vienna-Zeit)
select cron.schedule(
  'auto-assign-weekly-duties',
  '0 4 * * 0',
  $$ select auto_assign_weekly_duties(); $$
);
