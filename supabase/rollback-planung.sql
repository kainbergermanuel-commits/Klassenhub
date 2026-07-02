-- ============================================================
-- KlassenHub · Rollback Planungs-Tool
-- Entfernt planning_notes vollständig (inkl. Policies/Index).
-- ============================================================
drop table if exists public.planning_notes cascade;
