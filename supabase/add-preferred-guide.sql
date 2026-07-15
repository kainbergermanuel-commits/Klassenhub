-- ============================================================
-- KlassenHub · Mein Guide (Lieblings-Guide)
-- ------------------------------------------------------------
-- Persönliche Guide-Wahl fürs Heldenbuch — unabhängig von der aktuellen
-- Klassenwelt. Speichert den Theme-Icon-Key (z. B. 'landscape'), denselben
-- Schlüssel wie GUIDE_PORTRAIT/SEASON_ART. NULL = kein Favorit gewählt,
-- Fallback bleibt die aktuelle Klassenwelt (unverändertes Verhalten).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

alter table public.profiles add column if not exists preferred_guide_icon text;
