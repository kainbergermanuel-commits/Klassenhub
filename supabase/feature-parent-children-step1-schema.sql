-- ============================================================
-- ClassHaven · Ein Elternkonto, mehrere Kinder — STUFE 1: Schema (additiv)
-- ------------------------------------------------------------
-- Legt die n:m-Verknüpfung Eltern↔Kinder an und befüllt sie aus dem
-- Ist-Zustand. Ändert KEINE bestehende Policy und KEINE Funktion.
-- → Kann den Login NICHT brechen. Idempotent.
--
-- profiles.child_id bleibt bestehen und wird weiter mitgeschrieben.
-- Es ist bis auf Weiteres die Quelle für das Hauptkind. Der Abbau ist
-- gesperrt, solange es Policies mit "child_id is null"-Rückfallpfaden
-- gibt (siehe Stufe 0), denn dort kippt NULL auf "alle Kinder der
-- Klasse".
--
-- Im Supabase SQL-Editor ausführen.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.parent_children (
  parent_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Hauptkind: was ein Elternteil sieht, solange es keinen Umschalter gibt.
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (parent_id, student_id)
);

-- Für die Gegenrichtung: "welche Eltern hängen an diesem Kind".
CREATE INDEX IF NOT EXISTS parent_children_student_idx
  ON public.parent_children (student_id);

-- Genau ein Hauptkind pro Elternteil.
CREATE UNIQUE INDEX IF NOT EXISTS parent_children_ein_hauptkind
  ON public.parent_children (parent_id) WHERE is_primary;

-- Backfill aus dem Ist-Zustand. Jede bestehende Verknüpfung wird zum
-- Hauptkind. Eltern mit genau einem Kind verhalten sich danach exakt
-- wie vorher.
INSERT INTO public.parent_children (parent_id, student_id, is_primary)
SELECT id, child_id, true
FROM public.profiles
WHERE role = 'parent' AND child_id IS NOT NULL
ON CONFLICT (parent_id, student_id) DO NOTHING;

-- RLS: die Tabelle ist ab sofort geschützt. Lesen darf man nur die
-- eigenen Zeilen; geschrieben wird ausschließlich serverseitig über den
-- Service-Role-Key, der RLS ohnehin umgeht.
ALTER TABLE public.parent_children ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_children_read_own" ON public.parent_children;
CREATE POLICY "parent_children_read_own" ON public.parent_children
  FOR SELECT TO authenticated
  USING (parent_id = auth.uid());

-- ---- Kontrolle ----
-- Erwartet: eine Zeile je Elternteil mit gesetztem child_id, alle is_primary.
SELECT
  (SELECT count(*) FROM public.profiles WHERE role = 'parent')                    AS eltern_gesamt,
  (SELECT count(*) FROM public.profiles WHERE role = 'parent' AND child_id IS NOT NULL) AS mit_kind,
  (SELECT count(*) FROM public.parent_children)                                   AS verknuepfungen,
  (SELECT count(*) FROM public.parent_children WHERE is_primary)                  AS davon_hauptkind;
