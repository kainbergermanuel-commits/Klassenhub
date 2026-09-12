-- ============================================================
-- KlassenHub · Rollback Lerngruppen
-- ------------------------------------------------------------
-- Entfernt Tabellen, Funktionen und die drei HÜ-Spalten wieder.
-- ACHTUNG: Bereits ausgespielte Gruppen-Hausübungen bleiben als ganz
-- normale Klassen-Hausübungen mit Ausnahmen stehen — sie verlieren nur
-- ihre Gruppen-Kennzeichnung. Das ist gewollt: die Kinder sollen nach
-- einem Rückbau nicht plötzlich ihre Aufgaben verlieren.
-- ============================================================

drop function if exists public.rename_learning_group(uuid, text);
drop function if exists public.group_homework_students(uuid);
drop function if exists public.group_homework(uuid);
drop function if exists public.delete_group_homework(uuid);
drop function if exists public.update_group_homework(uuid, text, date, text);
drop function if exists public.can_manage_group_homework(uuid);
drop function if exists public.create_group_homework(uuid, text, date, text);
drop function if exists public.group_members(uuid);
drop function if exists public.can_lead_group(uuid);

drop table if exists public.learning_group_members cascade;
drop table if exists public.learning_groups cascade;

alter table public.homework drop column if exists group_label;
alter table public.homework drop column if exists group_batch_id;
alter table public.homework drop column if exists group_id;
