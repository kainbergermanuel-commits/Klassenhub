-- ============================================================
-- ClassHaven · Push-Benachrichtigungen (Web Push)
-- ------------------------------------------------------------
-- push_subscriptions: ein Eintrag pro Gerät/Browser einer Person.
--   endpoint ist eindeutig (ein Gerät = ein Endpoint). Läuft ein
--   Abo ab (Push-Dienst antwortet 404/410), löscht der Versand es.
-- notification_prefs: pro Person und Art an/aus. Fehlt eine Zeile,
--   gilt „an" (wer Push aktiviert, will sie standardmäßig).
--
-- Verschickt wird NICHT aus der Datenbank, sondern über die
-- Next.js-Route /api/push/webhook, ausgelöst von einem Supabase
-- Database Webhook (Dashboard → Database → Webhooks, INSERT auf
-- public.messages, Header x-push-secret = PUSH_WEBHOOK_SECRET).
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-push.sql
-- ============================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Jede Person sieht und verwaltet nur ihre eigenen Geräte.
-- Der Versand liest mit dem Service-Key (umgeht RLS).
drop policy if exists "push_subscriptions_own" on public.push_subscriptions;
create policy "push_subscriptions_own" on public.push_subscriptions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create table if not exists public.notification_prefs (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null check (kind in ('messages', 'events', 'reminders', 'homework')),
  enabled     boolean not null default true,
  primary key (user_id, kind)
);

alter table public.notification_prefs enable row level security;

drop policy if exists "notification_prefs_own" on public.notification_prefs;
create policy "notification_prefs_own" on public.notification_prefs
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
