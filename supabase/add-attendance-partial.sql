-- ============================================================
-- ClassHaven · Anwesenheit: zu spät gekommen / vorzeitig gegangen
-- ------------------------------------------------------------
-- Bisher war jede Zeile in `attendance` ein ganzer Fehltag. Teil-
-- abwesenheiten brauchen einen dritten Status: das Kind WAR da.
--   status 'anwesend'  = anwesend, aber zu spät und/oder früher weg
--   late               = zu spät gekommen (Verspätung, KEINE Fehlstunde)
--   gone_from_slot     = erste versäumte Stunde (1-10), null = bis Schluss da
-- Wichtig für alle Auswertungen: eine Zeile mit status 'anwesend' ist
-- KEIN Fehltag und darf nirgends mitgezählt werden.
-- Bewusst kein Freitext-Grund (Gesundheitsdaten, DSGVO Art. 9).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: siehe unten auskommentiert.
-- ============================================================

alter table public.attendance
  add column if not exists late            boolean  not null default false,
  add column if not exists gone_from_slot smallint;

-- Status um 'anwesend' erweitern
alter table public.attendance drop constraint if exists attendance_status_check;
alter table public.attendance add constraint attendance_status_check
  check (status in ('anwesend', 'entschuldigt', 'unentschuldigt'));

-- Stunde plausibel halten
alter table public.attendance drop constraint if exists attendance_gone_from_slot_check;
alter table public.attendance add constraint attendance_gone_from_slot_check
  check (gone_from_slot is null or gone_from_slot between 1 and 10);

-- Ein ganzer Fehltag kennt weder Verspätung noch Gehzeit, und eine
-- 'anwesend'-Zeile ohne beides wäre eine leere Zeile, die als Abweichung
-- in den Listen steht. Beides hier hart ausgeschlossen.
alter table public.attendance drop constraint if exists attendance_partial_check;
alter table public.attendance add constraint attendance_partial_check check (
  case when status = 'anwesend'
    then (late = true or gone_from_slot is not null)
    else (late = false and gone_from_slot is null)
  end
);

-- RLS bleibt unverändert: die Lehrer-Policy gilt "for all", und die
-- Eltern-Insert-Policy erzwingt weiterhin status = 'entschuldigt' —
-- Teilabwesenheiten kann also nur die Lehrperson eintragen.

-- Rollback:
-- alter table public.attendance drop constraint if exists attendance_partial_check;
-- alter table public.attendance drop constraint if exists attendance_gone_from_slot_check;
-- delete from public.attendance where status = 'anwesend';
-- alter table public.attendance drop constraint if exists attendance_status_check;
-- alter table public.attendance add constraint attendance_status_check
--   check (status in ('entschuldigt', 'unentschuldigt'));
-- alter table public.attendance drop column if exists late;
-- alter table public.attendance drop column if exists gone_from_slot;
