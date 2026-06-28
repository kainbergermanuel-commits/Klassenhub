-- Eltern-Bestätigung für Hausübungs-Erledigungen
-- Zweck: Leaderboard-Streak gilt nur für eltern-bestätigte Erledigungen

-- 1. Spalte hinzufügen
ALTER TABLE public.homework_completions
  ADD COLUMN IF NOT EXISTS confirmed_by_parent_at timestamptz;

-- 2. RLS: Eltern dürfen confirmed_by_parent_at für ihr Kind setzen
CREATE POLICY "parents_confirm_child_hw_completion"
ON public.homework_completions
FOR UPDATE
TO authenticated
USING (
  student_id = (
    SELECT child_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  )
)
WITH CHECK (
  student_id = (
    SELECT child_id FROM public.profiles
    WHERE id = auth.uid() AND role = 'parent'
  )
);
