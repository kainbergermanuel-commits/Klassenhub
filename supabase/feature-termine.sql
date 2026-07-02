-- ============================================================
-- KlassenHub · Termine (klassenspezifischer Kalender)
-- ------------------------------------------------------------
-- Ein Termin pro Zeile: Titel, optionale Beschreibung/Ort,
-- Datum (ein- oder mehrtägig), optional Uhrzeit, Kategorie.
-- Lesend für alle Klassenmitglieder, schreibend nur Lehrperson/Admin.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-termine.sql
-- ============================================================

create table if not exists public.events (
  id          uuid primary key default gen_random_uuid(),
  class_id    uuid not null references public.classes(id) on delete cascade,
  created_by  uuid not null references public.profiles(id) on delete cascade,
  title       text not null,
  description text not null default '',
  start_date  date not null,
  end_date    date not null,
  all_day     boolean not null default true,
  start_time  text,                              -- 'HH:MM', nur wenn all_day = false
  end_time    text,
  location    text not null default '',
  category    text not null default 'sonstiges' check (
    category in ('ausflug', 'elternabend', 'pruefung', 'frei', 'sonstiges')
  ),
  created_at  timestamptz not null default now(),
  check (end_date >= start_date)
);

create index if not exists events_class_date_idx
  on public.events (class_id, start_date);

alter table public.events enable row level security;

-- Lesen: alle Mitglieder der eigenen Klasse(n)
drop policy if exists "events_read" on public.events;
create policy "events_read" on public.events
  for select to authenticated
  using (class_id in (select public.my_class_ids()));

-- Schreiben: nur Lehrpersonen der eigenen Klasse(n)
drop policy if exists "events_write" on public.events;
create policy "events_write" on public.events
  for all to authenticated
  using (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  )
  with check (
    class_id in (select public.my_class_ids())
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
  );

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all" on public.events
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
