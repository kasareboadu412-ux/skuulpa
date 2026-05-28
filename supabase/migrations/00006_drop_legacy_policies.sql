-- Drop legacy policies that pre-date our migration set.
--
-- pg_policy showed four policies on public.students:
--   1. "School staff can read students"    ← recursion: subqueries students from inside students policy
--   2. "Parents can view their children only"   ← uses current_setting() instead of auth.jwt()
--   3. students_parent_read     ← ours (00004), correct
--   4. students_staff           ← ours (00003), correct
--
-- (1) is the infinite-recursion source. (2) is just stale. Drop both.
-- We also defensively drop any other legacy human-named policies that
-- might exist on related tables.

drop policy if exists "School staff can read students" on students;
drop policy if exists "Parents can view their children only" on students;
drop policy if exists "Parents view their children" on students;
drop policy if exists "Staff read students" on students;
drop policy if exists "Staff insert students" on students;
drop policy if exists "Staff update students" on students;
drop policy if exists "Staff delete students" on students;

-- Same cleanup pattern on other multi-tenant tables that might have legacy
-- policies — no-ops if these names don't exist:
do $$
declare
  rec record;
begin
  for rec in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and (
        policyname ilike '%school staff%'
        or policyname ilike '%parents can%'
        or policyname ilike '%can view%'
        or policyname ilike '%can read%'
        or policyname ilike '%can insert%'
        or policyname ilike '%can update%'
        or policyname ilike '%can delete%'
      )
  loop
    execute format('drop policy if exists %I on %I.%I',
      rec.policyname, rec.schemaname, rec.tablename);
  end loop;
end $$;
