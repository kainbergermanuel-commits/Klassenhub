-- ============================================================
-- KlassenHub · Mitteilungsheft: eigene Nachrichten löschen
-- ------------------------------------------------------------
-- Gelöscht wird weich: die Zeile bleibt als Platzhalter
-- ("Nachricht gelöscht") im Heft stehen, nur der Text verschwindet.
-- Ein Heft ist ein Dokument zwischen Schule und Familie — dass dort
-- etwas stand, soll sichtbar bleiben, auch wenn der Inhalt weg ist.
--
-- Regeln (serverseitig in delete_own_message, nicht nur in der UI):
--   · nur die eigene Nachricht (sender_id = auth.uid())
--   · nicht, wenn sie bereits "Zur Kenntnis genommen" wurde — sonst
--     verlöre die Bestätigung ihren Sinn
--   · Sammelnachricht: verschwindet aus ALLEN Heften (broadcast_id);
--     ist auch nur eine Kopie bestätigt, wird gar nichts gelöscht
--
-- seen_at wird mitgesetzt: eine gelöschte Nachricht ist nichts mehr,
-- das jemand lesen müsste, und darf kein Ungelesen-Badge auslösen.
--
-- Idempotent. Im Supabase SQL-Editor ausführen.
-- Rollback: rollback-message-delete.sql
-- ============================================================

alter table public.messages
  add column if not exists deleted_at timestamptz;

create or replace function public.delete_own_message(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  m public.messages%rowtype;
begin
  select * into m from public.messages
   where id = p_id and sender_id = auth.uid();

  if not found then
    raise exception 'Nachricht nicht gefunden oder nicht deine eigene' using errcode = '42501';
  end if;
  if m.deleted_at is not null then
    return;
  end if;

  if m.broadcast_id is null then
    if m.acknowledged_at is not null then
      raise exception 'Bereits bestätigte Nachrichten können nicht gelöscht werden' using errcode = 'P0001';
    end if;
    update public.messages
       set body = '', deleted_at = now(), seen_at = coalesce(seen_at, now())
     where id = m.id;
  else
    if exists (
      select 1 from public.messages
       where broadcast_id = m.broadcast_id and sender_id = auth.uid()
         and acknowledged_at is not null
    ) then
      raise exception 'Bereits bestätigte Nachrichten können nicht gelöscht werden' using errcode = 'P0001';
    end if;
    update public.messages
       set body = '', deleted_at = now(), seen_at = coalesce(seen_at, now())
     where broadcast_id = m.broadcast_id and sender_id = auth.uid() and deleted_at is null;
  end if;
end;
$$;

revoke all on function public.delete_own_message(uuid) from public, anon;
grant execute on function public.delete_own_message(uuid) to authenticated;
