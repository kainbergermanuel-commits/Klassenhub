-- Schüler/Eltern sehen bisher nur Profile, deren profiles.class_id in ihrer Klasse liegt.
-- Lehrpersonen, die einer Klasse NUR über teacher_classes zugeordnet sind (nicht als KV /
-- is_primary), haben aber eine andere profiles.class_id und wurden dadurch ausgeblendet.
-- Zusätzlich erlauben: Lehrpersonen lesen, die einer meiner Klassen via teacher_classes zugeteilt sind.
DROP POLICY IF EXISTS "profiles_read_classmates" ON public.profiles;
CREATE POLICY "profiles_read_classmates" ON public.profiles FOR SELECT TO authenticated
  USING (
    class_id IN (SELECT public.my_class_ids())
    OR id IN (
      SELECT teacher_id FROM public.teacher_classes
      WHERE class_id IN (SELECT public.my_class_ids())
    )
  );
