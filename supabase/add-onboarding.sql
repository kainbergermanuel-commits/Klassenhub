-- ============================================================
-- KlassenHub · Willkommens-Screen beim ersten Login
-- ------------------------------------------------------------
-- Merkt sich, ob jemand den Willkommens-Screen schon gesehen hat.
-- NULL = noch nie eingeloggt gewesen, Screen wird gezeigt.
-- Zeitstempel = erledigt, ab dann normaler Einstieg.
--
-- Das Backfill unten ist entscheidend: alle BESTEHENDEN Profile werden
-- sofort auf "erledigt" gesetzt. Sonst bekämen Lehrkräfte und Testkonten
-- den Screen beim nächsten Aufruf vorgesetzt. Nur Konten, die NACH dieser
-- Migration angelegt werden, sehen ihn — also genau die 32 Zugänge der 1b.
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

alter table public.profiles add column if not exists onboarded_at timestamptz;

update public.profiles set onboarded_at = now() where onboarded_at is null;
