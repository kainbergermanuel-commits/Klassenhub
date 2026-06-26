-- Nur Profile einfügen (auth.users-Einträge existieren bereits)
-- IDs aus auth.users holen und Profile anlegen

INSERT INTO profiles (id, role, full_name, class_id, avatar_color)
SELECT id, 'student', full_name, '00000000-0000-0000-0000-000000000001', color
FROM (VALUES
  ('jonas.gruber@mshirtenberg.at',    'Jonas Gruber',   '#C98A2B'),
  ('max.bauer@mshirtenberg.at',       'Max Bauer',      '#5965B8'),
  ('anna.schneider@mshirtenberg.at',  'Anna Schneider', '#E06B57'),
  ('felix.wagner@mshirtenberg.at',    'Felix Wagner',   '#2E9C6E'),
  ('sophie.mueller@mshirtenberg.at',  'Sophie Müller',  '#8B5CF6'),
  ('lukas.fischer@mshirtenberg.at',   'Lukas Fischer',  '#D97706'),
  ('emma.koch@mshirtenberg.at',       'Emma Koch',      '#0369A1'),
  ('noah.weber@mshirtenberg.at',      'Noah Weber',     '#BE185D'),
  ('mia.huber@mshirtenberg.at',       'Mia Huber',      '#065F46'),
  ('ben.lehner@mshirtenberg.at',      'Ben Lehner',     '#7C3AED'),
  ('lea.pichler@mshirtenberg.at',     'Lea Pichler',    '#B45309'),
  ('tim.steiner@mshirtenberg.at',     'Tim Steiner',    '#0284C7'),
  ('julia.maier@mshirtenberg.at',     'Julia Maier',    '#9D174D'),
  ('david.moser@mshirtenberg.at',     'David Moser',    '#047857')
) AS data(email, full_name, color)
JOIN auth.users u ON u.email = data.email
ON CONFLICT (id) DO NOTHING;
