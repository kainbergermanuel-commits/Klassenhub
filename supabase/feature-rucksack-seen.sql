-- ============================================================
-- KlassenHub · Rucksack: Erwerbs-Momente
-- ------------------------------------------------------------
-- Items schalteten bisher still frei — man merkte es nur, wenn man zufällig
-- den Rucksack öffnete. Diese Tabelle merkt sich, welcher Erwerbs-Moment einer
-- Schüler:in schon gezeigt wurde, damit jedes Zeichen genau einmal feierlich
-- übergeben wird und danach nie wieder.
--
-- item_key ist der stabile Schlüssel aus lib/rucksack.ts (RucksackItemKey) —
-- niemals umbenennen, sonst taucht ein längst gefundenes Item erneut als „neu"
-- auf. Bewusst kein FK/Enum: die Item-Liste lebt im Code, nicht in der DB.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.rucksack_item_seen (
  student_id  uuid not null references public.profiles(id) on delete cascade,
  item_key    text not null,
  seen_at     timestamptz not null default now(),
  primary key (student_id, item_key)
);

alter table public.rucksack_item_seen enable row level security;

-- Schüler:in liest und markiert ausschließlich die eigenen Einträge. Bewusst
-- KEINE Eltern-/Lehrer-Lesepolicy: welcher Übergabe-Dialog schon weggeklickt
-- wurde, ist reine UI-Buchhaltung und geht sonst niemanden etwas an.
drop policy if exists "rucksack_item_seen_own_read" on public.rucksack_item_seen;
create policy "rucksack_item_seen_own_read" on public.rucksack_item_seen
  for select to authenticated
  using (student_id = auth.uid());

drop policy if exists "rucksack_item_seen_own_insert" on public.rucksack_item_seen;
create policy "rucksack_item_seen_own_insert" on public.rucksack_item_seen
  for insert to authenticated
  with check (student_id = auth.uid());

drop policy if exists "rucksack_item_seen_admin_all" on public.rucksack_item_seen;
create policy "rucksack_item_seen_admin_all" on public.rucksack_item_seen
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
