-- Fehlerhafte Policy entfernen und durch zwei einfache ersetzen

DROP POLICY IF EXISTS "profiles_read_own" ON public.profiles;

-- 1. Jeder liest sein eigenes Profil (kein recursion-Problem)
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 2. Hilfsfunktion die class_id ohne RLS liest (security definer = läuft als Superuser)
CREATE OR REPLACE FUNCTION public.my_class_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$
  SELECT class_id FROM public.profiles WHERE id = auth.uid()
$$;

-- 3. Klassenmitglieder lesen (nutzt die Funktion statt direktem Subquery)
CREATE POLICY "profiles_read_classmates" ON public.profiles
  FOR SELECT TO authenticated
  USING (class_id = public.my_class_id());
