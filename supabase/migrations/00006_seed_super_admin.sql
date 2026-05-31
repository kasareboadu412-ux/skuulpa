-- Seed the platform super-admin account.
-- This is idempotent: does nothing if the row already exists.

insert into super_admins (email, name, role)
values ('kasareboadu412@gmail.com', 'Moishe', 'super_admin')
on conflict (email) do nothing;
