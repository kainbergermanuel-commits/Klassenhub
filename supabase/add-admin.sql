-- is_admin Flag auf profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Kainberger ist Admin
UPDATE public.profiles SET is_admin = true WHERE id = 'f98b22ad-f913-48e7-8701-4f244f014048';

-- Hilfsfunktion: ist der aktuelle User Admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- Hilfsfunktion: ist der aktuelle User Lehrer? (SECURITY DEFINER = kein RLS-Rekursion-Risiko)
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT COALESCE((SELECT role = 'teacher' FROM public.profiles WHERE id = auth.uid()), false)
$$;

-- Lehrer darf Profile seiner Klasse updaten (Schüler/Eltern anlegen/bearbeiten)
DROP POLICY IF EXISTS "profiles_teacher_manage" ON public.profiles;
CREATE POLICY "profiles_teacher_manage" ON public.profiles
  FOR ALL TO authenticated
  USING (class_id = public.my_class_id() AND public.is_teacher())
  WITH CHECK (class_id = public.my_class_id() AND public.is_teacher());

-- Admin darf alle Profile lesen und schreiben
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Admin darf alle Klassen lesen und schreiben
DROP POLICY IF EXISTS "classes_admin_all" ON public.classes;
CREATE POLICY "classes_admin_all" ON public.classes
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
