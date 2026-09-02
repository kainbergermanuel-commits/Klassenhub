-- ============================================================
-- KlassenHub · Schularbeiten im Terminsystem
-- ------------------------------------------------------------
-- Schularbeiten sind Fixtermine der Hauptfächer und gingen bisher in der
-- Kategorie "Prüfung" unter, ohne dass das Fach überhaupt gespeichert wurde.
-- Diese Migration ergänzt beides:
--
--   1. `subject_short` — das Fachkürzel aus dem Katalog `subjects` (D, E, M …).
--   2. Kategorie `schularbeit` zusätzlich zu den bisherigen fünf.
--
-- ⚠️ BEWUSST NUR DAS KÜRZEL, nicht wie bei `homework` zusätzlich Bezeichnung
-- und Farbe. Eine Hausübung ist ein historischer Datensatz, bei dem die
-- Momentaufnahme sinnvoll ist; eine Schularbeit ist ein ZUKÜNFTIGER Fixtermin.
-- Benennt der Admin ein Fach um oder ändert die Farbe, soll das mitziehen.
-- Nebenbei entfällt das Auseinanderlaufen dreier Spalten, das bei `homework`
-- schon einen dokumentierten Fallstrick hinterlassen hat (HomeworkCard.tsx).
--
-- Kein Fremdschlüssel auf `subjects(short)`: wird ein Fach aus dem Katalog
-- gelöscht, soll der Termin bestehen bleiben und nur das nackte Kürzel ohne
-- Farbe zeigen, statt die Löschung zu blockieren.
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: siehe unten (auskommentiert)
-- ============================================================

alter table public.events
  add column if not exists subject_short text;

-- Kategorie-Check austauschen. Der bestehende Check wurde in
-- feature-termine.sql inline und unbenannt angelegt, heisst also so, wie
-- Postgres ihn getauft hat. Statt den Namen zu raten wird er aufgelöst —
-- dann läuft die Migration unabhängig davon, wie er tatsächlich heisst.
do $$
declare
  v_name text;
begin
  select conname into v_name
  from pg_constraint
  where conrelid = 'public.events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%category%';

  if v_name is not null then
    execute format('alter table public.events drop constraint %I', v_name);
  end if;
end $$;

alter table public.events
  add constraint events_category_check check (
    category in ('ausflug', 'elternabend', 'pruefung', 'schularbeit', 'frei', 'sonstiges')
  );

-- Rollback:
-- update public.events set category = 'pruefung' where category = 'schularbeit';
-- alter table public.events drop constraint if exists events_category_check;
-- alter table public.events add constraint events_category_check check (
--   category in ('ausflug', 'elternabend', 'pruefung', 'frei', 'sonstiges'));
-- alter table public.events drop column if exists subject_short;
