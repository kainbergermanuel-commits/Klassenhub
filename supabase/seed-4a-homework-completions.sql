-- DEMO-SEED: realistische HÜ-Erledigungen für Klasse 4a
-- Befüllt aktive (noch fällige) Hausübungen mit ~72 % zufällig verteilten
-- Erledigungen je Schüler:in. Bestehende Einträge (z. B. Lena) bleiben dank
-- ON CONFLICT unberührt. Nur für Demo-/Entwicklungsdaten gedacht.
INSERT INTO public.homework_completions (homework_id, student_id, completed_at)
SELECT h.id,
       s.id,
       now() - (random() * interval '2 days')
FROM public.homework h
JOIN public.classes  c ON c.id = h.class_id AND c.name = '4a'
JOIN public.profiles s ON s.class_id = c.id AND s.role = 'student'
WHERE h.due_date >= current_date
  AND random() < 0.72
ON CONFLICT (homework_id, student_id) DO NOTHING;
