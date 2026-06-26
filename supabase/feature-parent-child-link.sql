-- ============================================================
-- Eltern↔Kind-Beziehung als echte DB-Spalte (ersetzt die
-- Nachnamen-Heuristik `matchChild`).
-- Idempotent, additiv, löscht keine Daten. Im SQL-Editor ausführen.
-- ============================================================

-- 1) Spalte anlegen (nullable → bestehende Zeilen unberührt) -----
alter table public.profiles
  add column if not exists child_id uuid references public.profiles(id) on delete set null;

-- 2) Backfill mit EXAKT der bisherigen Logik:
--    letzter Token des Eltern-Namens ("Fam. Hofer" → "Hofer"),
--    erstes Kind derselben Klasse, dessen Name darauf endet.
--    Nur wo bislang kein Link gesetzt ist und ein echter Treffer existiert
--    → keine willkürlichen "erstes Kind"-Fallbacks persistieren.
update public.profiles p
set child_id = sub.sid
from (
  select
    par.id as pid,
    (
      select s.id
      from public.profiles s
      where s.role = 'student'
        and s.class_id = par.class_id
        and right(lower(s.full_name), length(regexp_replace(par.full_name, '^.*\s', '')))
            = lower(regexp_replace(par.full_name, '^.*\s', ''))
      order by s.full_name
      limit 1
    ) as sid
  from public.profiles par
  where par.role = 'parent'
) sub
where p.id = sub.pid
  and sub.sid is not null
  and p.child_id is null;

-- 3) Index für Lookups child_id → schnelle Auflösung
create index if not exists profiles_child_id_idx on public.profiles (child_id);

-- 4) RLS-Härtung Streak-Bestätigung:
--    Verknüpfte Eltern dürfen NUR ihr eigenes Kind bestätigen.
--    Unverknüpfte Eltern (child_id is null) behalten das bisherige
--    Verhalten (alle Kinder der Klasse) → nichts bricht.
drop policy if exists "streak_parent_write" on public.streak_confirmations;
create policy "streak_parent_write" on public.streak_confirmations for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'parent'
        and p.class_id = (select class_id from public.profiles where id = student_id)
    )
    and (
      (select child_id from public.profiles where id = auth.uid()) is null
      or (select child_id from public.profiles where id = auth.uid()) = student_id
    )
  );
