-- ============================================================
-- KlassenHub · Lerngruppen (klassenübergreifender Unterricht)
-- ------------------------------------------------------------
-- Manche Kinder werden in einem Fach in einer festen Gruppe QUER ÜBER
-- KLASSEN unterrichtet (z.B. Mathematik in kleiner Gruppe, 3 Kinder aus der
-- 1a und 5 aus der 1b). Bisher musste die Lehrperson dieselbe Hausübung
-- zweimal anlegen — einmal je Klasse, jedes Mal mit einer langen Ausnahme-
-- liste — und hatte danach zwei getrennte Kontrolllisten.
--
-- ── Entwurfsentscheidung: Gruppe ist KEINE Klasse ─────────────────────────
-- Kinder bleiben 1:1 in ihrer Klasse (profiles.class_id). Eine Lerngruppe ist
-- nur eine Liste von Verweisen auf bestehende Kinder — kein zweites Konto,
-- kein zweiter Login, kein zweiter Klassenbegriff. Alles andere (Termine,
-- Anwesenheit, Stundenplan, Abenteuer) bleibt unberührt.
--
-- ── Entwurfsentscheidung: Arbeit beim SCHREIBEN, nicht beim LESEN ─────────
-- Eine Gruppen-Hausübung wird beim Anlegen in ganz normale Klassen-HÜ
-- AUFGETEILT: eine Zeile je beteiligter Klasse, mit excluded_student_ids so
-- gefüllt, dass genau die Gruppenkinder übrig bleiben. Für Kinder und Eltern
-- ist das danach eine gewöhnliche HÜ ihrer Klasse:
--   • kein zusätzlicher Zweig in einer Lesepolicy,
--   • keine zusätzliche Abfrage,
--   • kein einziger geänderter Codepfad auf der Kinder-/Elternseite.
-- Dasselbe Muster wie beim Mitteilungsheft (Fan-out beim Versand).
-- Die zusammengehörigen Zeilen teilen sich group_batch_id.
--
-- ── Entwurfsentscheidung: Schreiben über SECURITY-DEFINER-Funktionen ──────
-- Die Gruppenlehrerin ist oft KEINE Lehrperson der beteiligten Klassen. Sie
-- darf trotzdem für ihre acht Kinder eine HÜ anlegen — aber NICHT dadurch
-- Zugriff auf die ganzen Klassen bekommen. Deshalb laufen Anlegen, Ändern,
-- Löschen und die Kontrollliste über geprüfte Funktionen statt über eine
-- aufgeweichte Policy. Die bestehenden homework-Policies bleiben unverändert.
--
-- Datenschutz: Der GRUND einer Gruppenzugehörigkeit (etwa ein sonder-
-- pädagogischer Förderbedarf) wird nirgends gespeichert. Auch der Gruppenname
-- sollte neutral gewählt werden — er steht in der HÜ der Kinder.
--
-- Idempotent. Im Supabase-SQL-Editor ausführen.
-- Rollback: rollback-lerngruppen.sql
-- ============================================================

-- ---- 1) Tabellen -------------------------------------------

create table if not exists public.learning_groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  -- Fach aus dem Katalog (lib/subjectsCatalog.ts). Die Gruppe trägt ihr Fach
  -- selbst, statt es je Klasse aufzulösen: bei jahrgangsübergreifenden
  -- Gruppen können die Klassen-Kataloge auseinanderlaufen.
  subject       text not null default '',
  subject_short text not null default '',
  subject_color text not null default '#6E7E80',
  -- Führende Lehrperson: sie darf für die Gruppe Hausübungen anlegen und die
  -- Kontrollliste sehen. Genau eine, bewusst keine Liste — Vertretung regelt
  -- der Admin durch Umhängen.
  teacher_id  uuid references public.profiles(id) on delete set null,
  archived    boolean not null default false,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.learning_group_members (
  group_id   uuid not null references public.learning_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  primary key (group_id, student_id)
);

create index if not exists learning_group_members_student_idx
  on public.learning_group_members (student_id);

-- ---- 2) Spalten an der Hausübung ---------------------------
-- Alle drei sind NULL bei jeder bestehenden und jeder normalen Klassen-HÜ.
-- Rückwärtskompatibel per Bauart, genau wie excluded_student_ids.
alter table public.homework
  add column if not exists group_id uuid references public.learning_groups(id) on delete set null;
alter table public.homework
  add column if not exists group_batch_id uuid;
-- Der Gruppenname steht als TEXT in der Zeile, nicht als Verweis. Sonst
-- müsste jedes Kind beim Laden seiner HÜ zusätzlich die Gruppentabelle lesen
-- (eine Abfrage mehr + geöffnete Policy) — genau das soll nicht passieren.
-- Preis: nach dem Umbenennen einer Gruppe ziehen alte HÜ nicht automatisch
-- nach; rename_learning_group() unten erledigt das mit einem Schreibvorgang.
alter table public.homework
  add column if not exists group_label text;

create index if not exists homework_group_batch_idx on public.homework (group_batch_id);
create index if not exists homework_group_idx on public.homework (group_id);

comment on column public.homework.group_batch_id is
  'Klammert die je Klasse aufgeteilten Zeilen EINER Gruppen-Hausübung. Nie einzeln bearbeiten, immer über die Funktionen in feature-lerngruppen.sql.';

-- ---- 3) RLS ------------------------------------------------

alter table public.learning_groups        enable row level security;
alter table public.learning_group_members enable row level security;

-- Lesen: Admin alles, Lehrperson nur die eigenen Gruppen.
-- Kinder und Eltern lesen diese Tabellen NIE — sie sehen die Gruppe nur als
-- Text in ihrer Hausübung.
drop policy if exists "learning_groups_read" on public.learning_groups;
create policy "learning_groups_read" on public.learning_groups
  for select to authenticated
  using (public.is_admin() or teacher_id = (select auth.uid()));

-- Schreiben: ausschliesslich Admin (so festgelegt — Gruppen greifen über
-- Klassengrenzen, das soll nicht jede Lehrperson für fremde Klassen können).
drop policy if exists "learning_groups_admin_write" on public.learning_groups;
create policy "learning_groups_admin_write" on public.learning_groups
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "learning_group_members_read" on public.learning_group_members;
create policy "learning_group_members_read" on public.learning_group_members
  for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.learning_groups g
      where g.id = group_id and g.teacher_id = (select auth.uid())
    )
  );

drop policy if exists "learning_group_members_admin_write" on public.learning_group_members;
create policy "learning_group_members_admin_write" on public.learning_group_members
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---- 4) Helfer ---------------------------------------------

-- Darf ich diese Gruppe führen (= HÜ anlegen, Kontrollliste sehen)?
create or replace function public.can_lead_group(p_group uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (
    select 1 from public.learning_groups g
    where g.id = p_group and g.teacher_id = auth.uid()
  )
$$;

-- Mitglieder einer Gruppe mit Namen und Klasse. Als SECURITY DEFINER, weil
-- die Gruppenlehrerin Kinder aus Klassen sieht, die sie sonst nicht lesen
-- darf — aber eben NUR diese Kinder, nicht die ganze Klasse.
create or replace function public.group_members(p_group uuid)
returns table (
  student_id uuid, full_name text, class_id uuid, class_name text,
  avatar_color text, avatar_seed text, avatar_hair_color text, avatar_skin_color text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, p.class_id, c.name,
         p.avatar_color, p.avatar_seed, p.avatar_hair_color, p.avatar_skin_color
  from public.learning_group_members m
  join public.profiles p on p.id = m.student_id
  left join public.classes c on c.id = p.class_id
  where m.group_id = p_group
    and public.can_lead_group(p_group)
  order by c.name, p.full_name
$$;

-- ---- 5) Hausübung für eine Gruppe --------------------------

-- Legt EINE Gruppen-Hausübung an und teilt sie auf die beteiligten Klassen
-- auf. Gibt die group_batch_id zurück.
create or replace function public.create_group_homework(
  p_group   uuid,
  p_title   text,
  p_due     date,
  p_details text default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_batch uuid := gen_random_uuid();
  v_group public.learning_groups%rowtype;
  v_rows  int := 0;
begin
  if not public.can_lead_group(p_group) then
    raise exception 'Keine Berechtigung für diese Lerngruppe';
  end if;
  select * into v_group from public.learning_groups where id = p_group;
  if not found then raise exception 'Lerngruppe nicht gefunden'; end if;
  if v_group.archived then raise exception 'Lerngruppe ist archiviert'; end if;

  -- Eine Zeile je beteiligter Klasse. excluded_student_ids = alle Kinder
  -- dieser Klasse AUSSER den Gruppenmitgliedern; damit ist die Zeile für
  -- jeden bestehenden Codepfad eine ganz normale HÜ mit Ausnahmen.
  insert into public.homework (
    class_id, subject, subject_short, subject_color, title, due_date, details,
    created_by, status, excluded_student_ids, group_id, group_batch_id, group_label
  )
  select
    k.class_id, v_group.subject, v_group.subject_short, v_group.subject_color,
    p_title, p_due, nullif(btrim(coalesce(p_details, '')), ''),
    auth.uid(), 'published',
    -- Leeres Ergebnis (alle Kinder der Klasse sind in der Gruppe) wird zu
    -- NULL: "gilt für alle" ist in der Datenbank NULL, damit die Lesepolicy
    -- den billigen Weg nimmt, statt jede Zeile gegen ein leeres Array zu
    -- prüfen. Gleiche Konvention wie im Hausübungs-Formular.
    nullif(
      (select coalesce(array_agg(s.id), '{}'::uuid[])
         from public.profiles s
        where s.class_id = k.class_id and s.role = 'student'
          and s.id not in (select student_id from public.learning_group_members where group_id = p_group)),
      '{}'::uuid[]),
    p_group, v_batch, v_group.name
  from (
    select distinct p.class_id
    from public.learning_group_members m
    join public.profiles p on p.id = m.student_id
    where m.group_id = p_group and p.class_id is not null
  ) k;

  get diagnostics v_rows = row_count;
  if v_rows = 0 then raise exception 'Die Lerngruppe hat noch keine Mitglieder'; end if;
  return v_batch;
end;
$$;

-- Darf ich diese eine (aufgeteilte) Gruppen-HÜ ändern? Die Gruppenlehrerin
-- und der Admin immer; zusätzlich die Lehrperson einer beteiligten Klasse,
-- denn sie sieht die Zeile in ihrer Klassenliste und darf sie dort nicht
-- halb bearbeiten können.
create or replace function public.can_manage_group_homework(p_batch uuid)
returns boolean language sql stable security definer set search_path = public as $$
  -- LEFT JOIN, nicht JOIN: wird eine Gruppe gelöscht, verlieren ihre
  -- Hausübungen den Verweis (group_id → null), bleiben aber als Zeilen mit
  -- group_batch_id stehen. Mit einem inneren Join könnte sie danach niemand
  -- mehr bearbeiten oder löschen — die Lehrperson der Klasse muss es können.
  select exists (
    select 1 from public.homework h
    left join public.learning_groups g on g.id = h.group_id
    where h.group_batch_id = p_batch
      and (
        public.is_admin()
        or g.teacher_id = auth.uid()
        or (public.is_teacher() and h.class_id in (select public.my_class_ids()))
      )
  )
$$;

create or replace function public.update_group_homework(
  p_batch   uuid,
  p_title   text,
  p_due     date,
  p_details text default null
)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_group_homework(p_batch) then
    raise exception 'Keine Berechtigung für diese Hausübung';
  end if;
  update public.homework
     set title = p_title,
         due_date = p_due,
         details = nullif(btrim(coalesce(p_details, '')), '')
   where group_batch_id = p_batch;
end;
$$;

create or replace function public.delete_group_homework(p_batch uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.can_manage_group_homework(p_batch) then
    raise exception 'Keine Berechtigung für diese Hausübung';
  end if;
  delete from public.homework where group_batch_id = p_batch;
end;
$$;

-- Kontrollliste: alle Hausübungen einer Gruppe, über die Klassenhälften
-- hinweg zusammengeführt. EINE Abfrage in einer Lehreransicht — der
-- einzige neue Datenbankzugriff des ganzen Features.
create or replace function public.group_homework(p_group uuid)
returns table (
  batch_id uuid, title text, due_date date, details text,
  subject text, subject_short text, subject_color text,
  member_count int, done_count int, confirmed_count int
)
language sql stable security definer set search_path = public as $$
  with mem as (
    select student_id from public.learning_group_members where group_id = p_group
  ), hw as (
    select distinct on (h.group_batch_id)
           h.group_batch_id, h.title, h.due_date, h.details,
           h.subject, h.subject_short, h.subject_color
      from public.homework h
     where h.group_id = p_group and h.group_batch_id is not null
     order by h.group_batch_id, h.id
  )
  select hw.group_batch_id, hw.title, hw.due_date, hw.details,
         hw.subject, hw.subject_short, hw.subject_color,
         (select count(*)::int from mem),
         (select count(*)::int from public.homework_completions c
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)
             and c.student_id in (select student_id from mem)),
         (select count(*)::int from public.homework_completions c
           where c.homework_id in (select id from public.homework where group_batch_id = hw.group_batch_id)
             and c.student_id in (select student_id from mem)
             and c.confirmed_by_parent_at is not null)
  from hw
  where public.can_lead_group(p_group)
  order by hw.due_date desc
$$;

-- Wer hat abgegeben? Namentlich, für EINE Gruppen-HÜ.
create or replace function public.group_homework_students(p_batch uuid)
returns table (
  student_id uuid, full_name text, class_name text,
  avatar_color text, avatar_seed text, avatar_hair_color text, avatar_skin_color text,
  done boolean, confirmed boolean
)
language sql stable security definer set search_path = public as $$
  select p.id, p.full_name, c.name,
         p.avatar_color, p.avatar_seed, p.avatar_hair_color, p.avatar_skin_color,
         (co.student_id is not null),
         (co.confirmed_by_parent_at is not null)
    from public.homework h
    join public.learning_group_members m on m.group_id = h.group_id
    join public.profiles p on p.id = m.student_id
    left join public.classes c on c.id = p.class_id
    left join public.homework_completions co
           on co.homework_id = h.id and co.student_id = p.id and p.class_id = h.class_id
   where h.group_batch_id = p_batch
     and p.class_id = h.class_id
     and public.can_manage_group_homework(p_batch)
   order by c.name, p.full_name
$$;

-- Umbenennen zieht die Beschriftung in bestehenden Hausübungen mit (siehe
-- Begründung bei group_label oben).
create or replace function public.rename_learning_group(p_group uuid, p_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Nur Administration'; end if;
  update public.learning_groups set name = p_name where id = p_group;
  update public.homework set group_label = p_name where group_id = p_group;
end;
$$;

-- ---- Kontrolle ---------------------------------------------
-- select g.name, count(m.student_id) from public.learning_groups g
--   left join public.learning_group_members m on m.group_id = g.id
--   group by g.name order by g.name;
