-- Elternteil-Accounts für alle Schüler der Klasse 4a
-- Lena Hofer (hofer@mshirtenberg.at) existiert bereits → wird übersprungen
-- Ausführen im Supabase SQL Editor

DO $$
DECLARE
  parent_data RECORD;
  new_user_id UUID;
BEGIN
  FOR parent_data IN
    SELECT *
    FROM (VALUES
      ('eltern.gruber@mshirtenberg.at',    'Fam. Gruber'),
      ('eltern.bauer@mshirtenberg.at',     'Fam. Bauer'),
      ('eltern.schneider@mshirtenberg.at', 'Fam. Schneider'),
      ('eltern.wagner@mshirtenberg.at',    'Fam. Wagner'),
      ('eltern.mueller@mshirtenberg.at',   'Fam. Müller'),
      ('eltern.fischer@mshirtenberg.at',   'Fam. Fischer'),
      ('eltern.koch@mshirtenberg.at',      'Fam. Koch'),
      ('eltern.weber@mshirtenberg.at',     'Fam. Weber'),
      ('eltern.huber@mshirtenberg.at',     'Fam. Huber'),
      ('eltern.lehner@mshirtenberg.at',    'Fam. Lehner'),
      ('eltern.pichler@mshirtenberg.at',   'Fam. Pichler'),
      ('eltern.steiner@mshirtenberg.at',   'Fam. Steiner'),
      ('eltern.maier@mshirtenberg.at',     'Fam. Maier'),
      ('eltern.moser@mshirtenberg.at',     'Fam. Moser')
    ) AS t(email, full_name)
  LOOP
    -- Auth-User anlegen (nur wenn noch nicht vorhanden)
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = parent_data.email) THEN
      new_user_id := gen_random_uuid();
      INSERT INTO auth.users (
        id, email, encrypted_password, email_confirmed_at,
        created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data,
        aud, role
      ) VALUES (
        new_user_id,
        parent_data.email,
        crypt('klassenhub2024', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}',
        '{}',
        'authenticated', 'authenticated'
      );
    ELSE
      new_user_id := (SELECT id FROM auth.users WHERE email = parent_data.email);
    END IF;

    -- Profil anlegen / aktualisieren
    INSERT INTO public.profiles (id, role, full_name, class_id, avatar_color)
    VALUES (
      new_user_id,
      'parent',
      parent_data.full_name,
      '00000000-0000-0000-0000-000000000001',
      '#C98A2B'
    )
    ON CONFLICT (id) DO UPDATE SET
      role      = 'parent',
      full_name = EXCLUDED.full_name,
      class_id  = EXCLUDED.class_id;
  END LOOP;
END $$;
