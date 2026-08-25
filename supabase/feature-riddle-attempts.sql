-- ============================================================
-- KlassenHub · Rätsel-Versuche protokollieren
-- ------------------------------------------------------------
-- `quest_riddle_solutions.attempts` steht in jeder Zeile auf 1 und ist damit
-- tot: die Zeile entsteht erst beim ERFOLG, Fehlversuche hinterlassen keine
-- Spur. Für die Erhebung ist aber genau das Gegenteil interessant — wie oft
-- wird geraten, bevor gelöst wird? Das ist der Wert, an dem sich zeigt, ob ein
-- Rätsel wirklich zum Nachlesen der Story einlädt oder ob die richtige Antwort
-- schon aus den Optionen ablesbar ist.
--
-- Bewusst eine EIGENE Tabelle statt `solved_at` nullable zu machen: sonst
-- müssten vier bestehende Leser (Startseite, /streaks, Lehrer-Panel, Rätsel-
-- Liste) auf `solved_at is not null` filtern, und ein einziges Vergessen würde
-- ungelöste Rätsel als gelöst anzeigen. So ändert sich an der Lösungslogik
-- nichts, die Analytik läuft daneben.
--
-- Eine Zeile pro Versuch, mit Zeitstempel — dadurch auch auswertbar, wie viel
-- Zeit zwischen den Versuchen liegt (blättert das Kind in der Story nach?).
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- ============================================================

create table if not exists public.quest_riddle_attempts (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  riddle_key text not null,              -- Schlüssel in lib/riddles.ts, keine FK
  correct    boolean not null,
  created_at timestamptz not null default now()
);

create index if not exists quest_riddle_attempts_student_idx
  on public.quest_riddle_attempts (student_id, riddle_key);

alter table public.quest_riddle_attempts enable row level security;

-- Schüler:in schreibt und liest ausschließlich eigene Versuche (nur innerhalb
-- der eigenen Klasse) — RLS 1:1 wie quest_riddle_solutions.
drop policy if exists "quest_riddle_attempts_own" on public.quest_riddle_attempts;
create policy "quest_riddle_attempts_own" on public.quest_riddle_attempts
  for all to authenticated
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and class_id in (select public.my_class_ids())
  );

-- Lehrer liest die Versuche der eigenen Klasse(n). WICHTIG: Diese Zahl darf
-- NIE pro Kind sichtbar gemacht werden — „X hat 9 Mal geraten" wäre genau der
-- beschämende Vergleich, den Prinzip 1 ausschließt. Nur aggregiert je Rätsel
-- auswerten (Analytik für die Thesis, nicht fürs Cockpit).
drop policy if exists "quest_riddle_attempts_teacher_read" on public.quest_riddle_attempts;
create policy "quest_riddle_attempts_teacher_read" on public.quest_riddle_attempts
  for select to authenticated
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'teacher')
    and class_id in (select public.my_class_ids())
  );

drop policy if exists "quest_riddle_attempts_admin_all" on public.quest_riddle_attempts;
create policy "quest_riddle_attempts_admin_all" on public.quest_riddle_attempts
  for all to authenticated
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
