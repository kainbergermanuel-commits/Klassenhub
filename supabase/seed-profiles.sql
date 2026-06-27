-- Profile der Demo-User setzen (sucht die UUIDs automatisch per E-Mail)

update public.profiles set
  role         = 'teacher',
  full_name    = 'Herr Berger',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#0F8A82'
where id = (select id from auth.users where email = 'berger@schule.at');

update public.profiles set
  role         = 'student',
  full_name    = 'Lena Hofer',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#0F8A82'
where id = (select id from auth.users where email = 'lena@schule.at');

update public.profiles set
  role         = 'parent',
  full_name    = 'Fam. Hofer',
  class_id     = '00000000-0000-0000-0000-000000000001',
  avatar_color = '#C98A2B'
where id = (select id from auth.users where email = 'hofer@schule.at');
