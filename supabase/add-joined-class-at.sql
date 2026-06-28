-- Schüler-Eintrittsdatum
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS joined_class_at timestamptz;

-- Backfill: alle bestehenden Schüler auf 10.10.2025
UPDATE public.profiles
SET joined_class_at = '2025-10-10 00:00:00+00'
WHERE role = 'student' AND joined_class_at IS NULL;
