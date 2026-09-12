-- ============================================================
-- KlassenHub · Standard-Ausnahmen je Kind und Fach
-- ------------------------------------------------------------
-- Manche Kinder nehmen an einem Fach dauerhaft nicht teil (etwa weil sie in
-- diesem Fach gesondert unterrichtet werden). Bisher musste die Lehrperson
-- das bei JEDER Hausübung neu von Hand ausnehmen — und vergass es
-- zwangsläufig irgendwann, womit das Kind eine HÜ bekam, die es nie
-- bearbeiten sollte, und sie ihm als versäumt angerechnet wurde.
--
-- ── Was hier NICHT gespeichert wird ───────────────────────────────────────
-- Kein Status, keine Diagnose, kein sonderpädagogischer Förderbedarf. Die
-- Tabelle kennt ausschliesslich die organisatorische Tatsache „dieses Kind
-- ist in diesem Fach nicht dabei". Dieselbe Linie wie bei
-- add-homework-exclusions.sql, wo der Grund einer Ausnahme bewusst nirgends
-- abgelegt wird. Das ist keine Formalie: der Quellcode dieses Projekts ist
-- öffentlich einsehbar.
--
-- ── Wirkungsweise: Vorauswahl, keine Automatik beim Lesen ─────────────────
-- Die Standard-Ausnahme wirkt NUR im Moment des Anlegens einer Hausübung:
-- die betroffenen Kinder sind dort vorausgewählt ausgenommen, sichtbar und
-- überschreibbar. Gespeichert wird danach wie bisher allein
-- homework.excluded_student_ids. Auf dem Lesepfad der Kinder ändert sich
-- damit nichts — keine zusätzliche Abfrage, keine geänderte Policy.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- Rollback: siehe unten (auskommentiert)
-- ============================================================

create table if not exists public.subject_default_exclusions (
  class_id      uuid not null references public.classes(id)  on delete cascade,
  student_id    uuid not null references public.profiles(id) on delete cascade,
  -- Fachkürzel aus dem Katalog (subjects.short), nicht der Langname: die HÜ
  -- trägt es ebenfalls (homework.subject_short) und es bleibt bei einer
  -- Umbenennung des Fachs stabil.
  subject_short text not null,
  created_by    uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  primary key (class_id, student_id, subject_short)
);

alter table public.subject_default_exclusions enable row level security;

-- Nur Lehrpersonen der Klasse und Admin. Kinder und Eltern lesen die Tabelle
-- NIE — für sie ist die Ausnahme längst in der Hausübung materialisiert.
drop policy if exists "subject_default_exclusions_teacher" on public.subject_default_exclusions;
create policy "subject_default_exclusions_teacher" on public.subject_default_exclusions
  for all to authenticated
  using (class_id in (select public.my_class_ids()) and public.is_teacher())
  with check (class_id in (select public.my_class_ids()) and public.is_teacher());

drop policy if exists "subject_default_exclusions_admin" on public.subject_default_exclusions;
create policy "subject_default_exclusions_admin" on public.subject_default_exclusions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Rollback:
-- drop table if exists public.subject_default_exclusions cascade;
