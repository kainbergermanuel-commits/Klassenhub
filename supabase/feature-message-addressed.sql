-- ============================================================
-- ClassHaven · Mitteilungsheft: Elternnachricht gezielt an eine Lehrperson
-- ------------------------------------------------------------
-- Eltern können beim Schreiben optional eine Lehrperson der Klasse
-- auswählen. Ohne Auswahl bleibt alles wie bisher (allgemeines Heft).
--
--   addressed_teacher_id = angeschriebene Lehrperson, NULL = an alle
--
-- Bei gezielten Nachrichten bedeutet seen_at: "die ANGESCHRIEBENE
-- Lehrperson hat gelesen". Öffnet eine Kollegin das Heft vorher, bleibt
-- seen_at leer. Damit verschwindet das "neu" nicht mehr für die
-- gemeinte Person, und das Gelesen-Häkchen der Eltern stimmt.
-- Das Heft bleibt gemeinsam: alle Lehrpersonen der Klasse lesen mit.
--
-- Abgesichert per Trigger, nicht nur im Client:
--   - Adressat nur bei Elternnachrichten, und nur eine Lehrperson,
--     die der Klasse über teacher_classes zugeordnet ist
--   - Adressat ist nach dem Anlegen unveränderlich
--   - seen_at einer gezielten Nachricht setzt nur der Adressat
--     (Ausnahme: weiches Löschen über delete_own_message)
--
-- Keine neue Tabelle, daher keine GRANTs nötig.
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-message-addressed.sql
-- ============================================================

alter table public.messages
  add column if not exists addressed_teacher_id uuid references public.profiles(id) on delete set null;

create index if not exists messages_addressed_idx
  on public.messages (addressed_teacher_id)
  where addressed_teacher_id is not null;

create or replace function public.messages_addressed_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.addressed_teacher_id is not null then
      if new.sender_id is distinct from new.parent_id then
        raise exception 'Nur Elternnachrichten können an eine Lehrperson gerichtet werden' using errcode = '42501';
      end if;
      if not exists (
        select 1 from public.teacher_classes
         where teacher_id = new.addressed_teacher_id and class_id = new.class_id
      ) then
        raise exception 'Diese Lehrperson unterrichtet nicht in dieser Klasse' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE: Adressat bleibt, wie er angelegt wurde.
  new.addressed_teacher_id := old.addressed_teacher_id;

  -- Gelesen-Stand einer gezielten Nachricht gehört dem Adressaten.
  -- auth.uid() ist NULL für den Service-Key (Webhook, Admin-Skripte).
  if old.addressed_teacher_id is not null
     and new.seen_at is distinct from old.seen_at
     and auth.uid() is not null
     and auth.uid() <> old.addressed_teacher_id
     and new.deleted_at is null
  then
    new.seen_at := old.seen_at;
  end if;

  return new;
end;
$$;

drop trigger if exists messages_addressed_guard on public.messages;
create trigger messages_addressed_guard
  before insert or update on public.messages
  for each row execute function public.messages_addressed_guard();
