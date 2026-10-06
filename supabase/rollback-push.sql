-- Rollback zu feature-push.sql. Vorher den Database Webhook im
-- Supabase-Dashboard löschen, sonst laufen dessen Aufrufe ins Leere.
drop table if exists public.notification_prefs;
drop table if exists public.push_subscriptions;
