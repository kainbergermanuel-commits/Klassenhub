-- ============================================================
-- KlassenHub · Erfolg-Art 'riddle' erlauben (Rätsel im Logbuch)
-- ------------------------------------------------------------
-- Gelöste interaktive Rätsel (quest_riddle_solutions) sollen als Erfolg im
-- Heldenbuch-Logbuch (buildChronicle) erscheinen — wie Quests, aber als
-- eigene Art. feature-achievements.sql beschränkt `kind` per CHECK auf
-- ('quest','guild_quest','class_goal'); diese Migration erweitert die
-- Constraint um 'riddle'.
--
-- Bewusst KEINE Aufnahme in den Wappen-Fragment-Zähler (der zählt weiter nur
-- quest+guild_quest+class_goal, siehe RucksackItems) — die Balance des
-- Wappen-Freischalt-Schwellenwerts bleibt dadurch unverändert; Rätsel werden
-- rein im Logbuch gewürdigt.
--
-- `period` bei Rätsel-Erfolgen = '' (dauerhaft, ein Eintrag pro Rätsel, analog
-- scope='' in quest_riddle_solutions). Idempotent. Im SQL-Editor ausführen.
-- ============================================================

alter table public.achievements drop constraint if exists achievements_kind_check;
alter table public.achievements add constraint achievements_kind_check
  check (kind in ('quest', 'guild_quest', 'class_goal', 'riddle'));
