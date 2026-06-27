-- Add subjects JSONB column to profiles for teacher subject assignments
alter table profiles add column if not exists subjects jsonb default '[]'::jsonb;
