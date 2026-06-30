-- Feature-Migration: Digitales Mitteilungsheft
-- ---------------------------------------------------------------
-- Modell: Jedes ELTERNTEIL hat genau ein Heft = der Thread mit der
-- Lehrkraft. Eine Nachricht (`messages`) gehoert immer GENAU einem
-- Heft (parent_id). Eine "Sammelnachricht" an mehrere Schueler ist
-- nur ein Fan-out: dieselbe Nachricht wird in mehrere Hefte
-- geschrieben (verbunden ueber broadcast_id, damit die Lehrkraft
-- "von X/Y gesehen" sieht). Schueler haben KEINEN Zugriff.
--
-- "Gesehen" ist beidseitig und kostenlos: jede Nachricht hat genau
-- einen Empfaenger (die jeweils andere Person), daher genuegt eine
-- einzige seen_at-Spalte fuer beide Richtungen.

create table if not exists public.messages (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes(id) on delete cascade,
  parent_id    uuid not null references public.profiles(id) on delete cascade,  -- Besitzer des Hefts (Elternteil)
  sender_id    uuid references public.profiles(id) on delete set null,          -- Lehrkraft ODER das Elternteil selbst
  body         text not null,
  created_at   timestamptz not null default now(),
  seen_at      timestamptz,                                                     -- gesetzt, wenn der Empfaenger (Gegenueber) gelesen hat
  broadcast_id uuid                                                             -- gruppiert die Kopien einer Sammelnachricht
);

create index if not exists messages_parent_idx    on public.messages (parent_id, created_at);
create index if not exists messages_class_idx      on public.messages (class_id);
create index if not exists messages_broadcast_idx  on public.messages (broadcast_id);

alter table public.messages enable row level security;

-- READ: Elternteil sieht das eigene Heft; Lehrkraft sieht alle Hefte ihrer Klasse(n).
drop policy if exists "messages_read" on public.messages;
create policy "messages_read" on public.messages for select to authenticated
  using (
    parent_id = auth.uid()
    or (
      class_id in (select public.my_class_ids())
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );

-- INSERT: Elternteil schreibt nur ins eigene Heft (als Absender = es selbst).
--         Lehrkraft schreibt in jedes Heft der eigenen Klasse(n).
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert" on public.messages for insert to authenticated
  with check (
    -- Elternteil-Antwort im eigenen Heft
    (
      parent_id = auth.uid()
      and sender_id = auth.uid()
      and class_id = public.my_class_id()
    )
    or
    -- Lehrkraft schreibt einem Elternteil der eigenen Klasse
    (
      sender_id = auth.uid()
      and class_id in (select public.my_class_ids())
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
      and exists (select 1 from public.profiles p where p.id = parent_id and p.role = 'parent' and p.class_id = messages.class_id)
    )
  );

-- UPDATE: nur fuer das Setzen von seen_at gedacht.
--   Elternteil markiert Lehrer-Nachrichten im eigenen Heft als gesehen.
--   Lehrkraft markiert Eltern-Nachrichten der eigenen Klasse als gesehen.
drop policy if exists "messages_update" on public.messages;
create policy "messages_update" on public.messages for update to authenticated
  using (
    parent_id = auth.uid()
    or (
      class_id in (select public.my_class_ids())
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );

-- DELETE: Absender darf eigene Nachricht loeschen; Lehrkraft darf in
--         der eigenen Klasse loeschen.
drop policy if exists "messages_delete" on public.messages;
create policy "messages_delete" on public.messages for delete to authenticated
  using (
    sender_id = auth.uid()
    or (
      class_id in (select public.my_class_ids())
      and exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    )
  );
