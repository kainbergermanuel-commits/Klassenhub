-- Schritt 1: Alle User anzeigen (damit wir die richtigen E-Mails sehen)
SELECT id, email FROM auth.users;

-- Schritt 2: Profile updaten (alle 3 User nach ihren echten E-Mails)
-- Passe die E-Mail-Adressen unten an deine tatsächlichen User an!

UPDATE public.profiles SET
  role         = 'teacher',
  full_name    = 'Hr. Berger',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#0F8A82'
WHERE id = (SELECT id FROM auth.users WHERE email = 'berger@mshirtenberg.at');

UPDATE public.profiles SET
  role         = 'student',
  full_name    = 'Lena Hofer',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#0F8A82'
WHERE id = (SELECT id FROM auth.users WHERE email = 'lena@mshirtenberg.at');

UPDATE public.profiles SET
  role         = 'parent',
  full_name    = 'Fam. Hofer',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#C98A2B'
WHERE id = (SELECT id FROM auth.users WHERE email = 'hofer@mshirtenberg.at');

-- Schritt 3: Kontrolle — sollte 3 Zeilen zeigen mit class_id gesetzt
SELECT id, role, full_name, class_id FROM public.profiles;
