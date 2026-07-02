-- ============================================================
-- KlassenHub · Rollback Termine-Feature
-- Entfernt events vollständig (inkl. Policies/Index).
-- ============================================================
drop table if exists public.events cascade;
