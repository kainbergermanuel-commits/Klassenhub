-- ============================================================
-- KlassenHub · Fix: doppelte Dienst-Zuteilung durch die Wochen-Cron
-- ------------------------------------------------------------
-- BEFUND: assign_duties_for_class() griff die zwei Kinder je Dienst per
-- Modulo aus der gemischten Liste:
--     v_shuffled[((v_i * 2 - 2) % array_length(v_shuffled, 1)) + 1]
-- Bei weniger als 12 Schüler:innen wickelt das um, und dieselben Kinder
-- bekommen in einer Woche ZWEI Dienste. Die Oberfläche zeigte lange nur den
-- ersten davon, während "Dienst durchgehalten" (Heldenbuch, Eltern- und
-- Lehrer-Panel) alle zugeteilten Dienste verlangte — ein Zustand, den das
-- Kind nicht erreichen konnte.
--
-- FIX: streng aufsteigend aus der gemischten Liste greifen, keine Wiederholung.
-- Reicht die Klasse nicht für alle sechs Dienste, bekommt der letzte belegte
-- Dienst eben nur ein Kind; Dienste ohne Kind werden gar nicht angelegt
-- (vorher hätte es sie mit leerer Zuteilung gegeben). Damit verhält sich die
-- Cron genauso wie der "Zufällig zuweisen"-Knopf in der App.
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

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
  v_shuffled uuid[];
  v_count int;
  v_duty text;
  v_i int;
  v_a int;   -- Index des ersten Kindes (1-basiert)
  v_picks uuid[];
begin
  select array_agg(id order by random())
  into v_shuffled
  from profiles
  where class_id = p_class_id and role = 'student';

  if v_shuffled is null or array_length(v_shuffled, 1) = 0 then
    return;
  end if;

  v_count := array_length(v_shuffled, 1);

  for v_i in 1..array_length(v_duties, 1) loop
    v_duty := v_duties[v_i];
    v_a := v_i * 2 - 1;

    -- Kinder aufgebraucht: diesen und alle weiteren Dienste auslassen.
    exit when v_a > v_count;

    if v_a + 1 <= v_count then
      v_picks := array[v_shuffled[v_a], v_shuffled[v_a + 1]];
    else
      v_picks := array[v_shuffled[v_a]];
    end if;

    insert into duties (class_id, week_start, duty_name, assignee_ids, created_by)
    values (p_class_id, p_week_start, v_duty, v_picks, null)
    on conflict (class_id, week_start, duty_name) do nothing;
  end loop;
end;
$$;
