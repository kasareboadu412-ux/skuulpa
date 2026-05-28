-- Fix the "infinite recursion detected in policy for relation 'students'" error.
--
-- The root cause: the original migration created two policies on students
-- (students_staff FOR ALL, students_parent_read FOR SELECT). Postgres evaluates
-- ALL applicable policies for each operation. Combined with FK lookups and
-- joined SELECTs from other policies that reference students (fee_assignments,
-- attendance_records, behavior_logs, etc.), Postgres ends up in a planner loop.
--
-- Fix strategy:
--   1. Drop every "parent read" policy that references students from another
--      table (these are the loop sources).
--   2. Replace them with SECURITY DEFINER helpers — those bypass RLS, so they
--      don't trigger recursive evaluation.
--   3. Keep the simple staff policies as-is (they only touch auth.jwt()).
--
-- This preserves the security guarantees (parents still only see their own
-- children, staff still only see their school) but eliminates the loop.

-- ─── Drop existing parent-read policies that cause recursion ─────────────────

drop policy if exists "students_parent_read" on students;
drop policy if exists "attendance_parent_read" on attendance_records;
drop policy if exists "fee_assignments_parent_read" on fee_assignments;
drop policy if exists "fee_payments_parent_read" on fee_payments;
drop policy if exists "behavior_parent_read" on behavior_logs;
drop policy if exists "homework_parent_read" on homework;
drop policy if exists "assessment_scores_parent_read" on assessment_scores;
drop policy if exists "report_cards_parent_read" on report_cards;
drop policy if exists "receipts_parent_read" on receipts;

-- ─── SECURITY DEFINER helper: does the current parent own this student? ─────
--
-- SECURITY DEFINER runs with the function owner's privileges, bypassing RLS.
-- That prevents recursive policy evaluation when the helper is called from
-- a policy on a table that joins back to students.

create or replace function is_parent_of_student(sid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from students s
    where s.id = sid
      and (
        s.parent_user_id = auth.uid()
        or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
      )
  )
$$;

grant execute on function is_parent_of_student(uuid) to authenticated, anon;

-- ─── Recreate parent-read policies using the helper ─────────────────────────

create policy "students_parent_read" on students
  for select using (
    auth_role() = 'parent' and is_parent_of_student(id)
  );

create policy "attendance_parent_read" on attendance_records
  for select using (
    auth_role() = 'parent' and is_parent_of_student(student_id)
  );

create policy "fee_assignments_parent_read" on fee_assignments
  for select using (
    auth_role() = 'parent' and is_parent_of_student(student_id)
  );

create policy "fee_payments_parent_read" on fee_payments
  for select using (
    auth_role() = 'parent' and is_parent_of_student(student_id)
  );

create policy "behavior_parent_read" on behavior_logs
  for select using (
    auth_role() = 'parent'
    and shared_with_parent = true
    and is_parent_of_student(student_id)
  );

create policy "assessment_scores_parent_read" on assessment_scores
  for select using (
    auth_role() = 'parent' and is_parent_of_student(student_id)
  );

create policy "report_cards_parent_read" on report_cards
  for select using (
    auth_role() = 'parent' and is_parent_of_student(student_id)
  );

-- homework is keyed by class, not student. Use a separate helper.
create or replace function is_parent_in_class(cid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from students s
    where s.class_id = cid
      and (
        s.parent_user_id = auth.uid()
        or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
      )
  )
$$;

grant execute on function is_parent_in_class(uuid) to authenticated, anon;

create policy "homework_parent_read" on homework
  for select using (
    auth_role() = 'parent' and is_parent_in_class(class_id)
  );

-- receipts: parent owns the receipt if they own the payment's student
create or replace function is_parent_of_payment(pid uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from fee_payments fp
    join students s on s.id = fp.student_id
    where fp.id = pid
      and (
        s.parent_user_id = auth.uid()
        or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
      )
  )
$$;

grant execute on function is_parent_of_payment(uuid) to authenticated, anon;

create policy "receipts_parent_read" on receipts
  for select using (
    auth_role() = 'parent' and is_parent_of_payment(payment_id)
  );
