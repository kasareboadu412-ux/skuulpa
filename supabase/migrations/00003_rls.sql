-- Enable Row-Level Security on all multi-tenant tables.
-- API routes enforce school scoping in application code; RLS is a defence-in-depth layer.
-- The service-role key bypasses RLS (used by auth-guard helpers and super-admin routes).

-- Helper: extract school_id from the authenticated user's JWT metadata
create or replace function auth_school_id()
returns uuid
language sql
stable
as $$
  select nullif(
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'school_id'),
      (auth.jwt() ->> 'school_id')
    ),
    ''
  )::uuid
$$;

-- Helper: extract role from JWT metadata
create or replace function auth_role()
returns text
language sql
stable
as $$
  select coalesce(
    auth.jwt() -> 'user_metadata' ->> 'role',
    auth.jwt() ->> 'role',
    ''
  )
$$;

-- Helper: is the current user a staff member for the given school?
create or replace function is_staff_for_school(sid uuid)
returns boolean
language sql
stable
as $$
  select auth.uid() is not null
     and auth_role() not in ('parent', '')
     and auth_school_id() = sid
$$;

-- ─── schools ──────────────────────────────────────────────────────────────────
alter table schools enable row level security;

create policy "schools_staff_own" on schools
  for all using (is_staff_for_school(id));

-- ─── academic_years ──────────────────────────────────────────────────────────
alter table academic_years enable row level security;

create policy "academic_years_staff" on academic_years
  for all using (is_staff_for_school(school_id));

-- ─── terms ───────────────────────────────────────────────────────────────────
alter table terms enable row level security;

create policy "terms_staff" on terms
  for all using (
    exists (
      select 1 from academic_years ay
      where ay.id = terms.academic_year_id
        and is_staff_for_school(ay.school_id)
    )
  );

-- ─── classes ─────────────────────────────────────────────────────────────────
alter table classes enable row level security;

create policy "classes_staff" on classes
  for all using (is_staff_for_school(school_id));

-- ─── subjects ────────────────────────────────────────────────────────────────
alter table subjects enable row level security;

create policy "subjects_staff" on subjects
  for all using (is_staff_for_school(school_id));

-- ─── teachers ────────────────────────────────────────────────────────────────
alter table teachers enable row level security;

create policy "teachers_staff" on teachers
  for all using (is_staff_for_school(school_id));

-- ─── teacher_attendance ──────────────────────────────────────────────────────
alter table teacher_attendance enable row level security;

create policy "teacher_attendance_staff" on teacher_attendance
  for all using (
    exists (
      select 1 from teachers t
      where t.id = teacher_attendance.teacher_id
        and is_staff_for_school(t.school_id)
    )
  );

-- ─── students ────────────────────────────────────────────────────────────────
alter table students enable row level security;

-- Staff see their own school's students
create policy "students_staff" on students
  for all using (is_staff_for_school(school_id));

-- Parents see only their own children (by phone or user_id)
create policy "students_parent_read" on students
  for select using (
    auth_role() = 'parent'
    and (
      parent_user_id = auth.uid()
      or parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
      or parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
    )
  );

-- ─── attendance_records ──────────────────────────────────────────────────────
alter table attendance_records enable row level security;

create policy "attendance_staff" on attendance_records
  for all using (
    exists (
      select 1 from students s
      where s.id = attendance_records.student_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "attendance_parent_read" on attendance_records
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      where s.id = attendance_records.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── fee_structures ──────────────────────────────────────────────────────────
alter table fee_structures enable row level security;

create policy "fee_structures_staff" on fee_structures
  for all using (is_staff_for_school(school_id));

-- ─── fee_assignments ─────────────────────────────────────────────────────────
alter table fee_assignments enable row level security;

create policy "fee_assignments_staff" on fee_assignments
  for all using (
    exists (
      select 1 from students s
      where s.id = fee_assignments.student_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "fee_assignments_parent_read" on fee_assignments
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      where s.id = fee_assignments.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── fee_payments ────────────────────────────────────────────────────────────
alter table fee_payments enable row level security;

create policy "fee_payments_staff" on fee_payments
  for all using (
    exists (
      select 1 from students s
      where s.id = fee_payments.student_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "fee_payments_parent_read" on fee_payments
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      where s.id = fee_payments.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── behavior_logs ───────────────────────────────────────────────────────────
alter table behavior_logs enable row level security;

create policy "behavior_staff" on behavior_logs
  for all using (
    exists (
      select 1 from students s
      where s.id = behavior_logs.student_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "behavior_parent_read" on behavior_logs
  for select using (
    auth_role() = 'parent'
    and shared_with_parent = true
    and exists (
      select 1 from students s
      where s.id = behavior_logs.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── homework ────────────────────────────────────────────────────────────────
alter table homework enable row level security;

create policy "homework_staff" on homework
  for all using (
    exists (
      select 1 from classes c
      where c.id = homework.class_id
        and is_staff_for_school(c.school_id)
    )
  );

create policy "homework_parent_read" on homework
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      join classes c on c.id = s.class_id
      where c.id = homework.class_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── assessments ─────────────────────────────────────────────────────────────
alter table assessments enable row level security;

create policy "assessments_staff" on assessments
  for all using (
    exists (
      select 1 from classes c
      where c.id = assessments.class_id
        and is_staff_for_school(c.school_id)
    )
  );

-- ─── assessment_scores ───────────────────────────────────────────────────────
alter table assessment_scores enable row level security;

create policy "assessment_scores_staff" on assessment_scores
  for all using (
    exists (
      select 1 from assessments a
      join classes c on c.id = a.class_id
      where a.id = assessment_scores.assessment_id
        and is_staff_for_school(c.school_id)
    )
  );

create policy "assessment_scores_parent_read" on assessment_scores
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      where s.id = assessment_scores.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── report_cards ────────────────────────────────────────────────────────────
alter table report_cards enable row level security;

create policy "report_cards_staff" on report_cards
  for all using (
    exists (
      select 1 from students s
      where s.id = report_cards.student_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "report_cards_parent_read" on report_cards
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from students s
      where s.id = report_cards.student_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );

-- ─── expenses ────────────────────────────────────────────────────────────────
alter table expenses enable row level security;

create policy "expenses_staff" on expenses
  for all using (is_staff_for_school(school_id));

-- ─── bus_routes ──────────────────────────────────────────────────────────────
alter table bus_routes enable row level security;

create policy "bus_routes_staff" on bus_routes
  for all using (is_staff_for_school(school_id));

-- ─── bus_subscriptions ───────────────────────────────────────────────────────
alter table bus_subscriptions enable row level security;

create policy "bus_subscriptions_staff" on bus_subscriptions
  for all using (
    exists (
      select 1 from students s
      where s.id = bus_subscriptions.student_id
        and is_staff_for_school(s.school_id)
    )
  );

-- ─── feeding_plans ───────────────────────────────────────────────────────────
alter table feeding_plans enable row level security;

create policy "feeding_plans_staff" on feeding_plans
  for all using (is_staff_for_school(school_id));

-- ─── feeding_subscriptions ───────────────────────────────────────────────────
alter table feeding_subscriptions enable row level security;

create policy "feeding_subscriptions_staff" on feeding_subscriptions
  for all using (
    exists (
      select 1 from students s
      where s.id = feeding_subscriptions.student_id
        and is_staff_for_school(s.school_id)
    )
  );

-- ─── daily_feeding_attendance ────────────────────────────────────────────────
alter table daily_feeding_attendance enable row level security;

create policy "feeding_attendance_staff" on daily_feeding_attendance
  for all using (
    exists (
      select 1 from students s
      where s.id = daily_feeding_attendance.student_id
        and is_staff_for_school(s.school_id)
    )
  );

-- ─── absence_notifications ───────────────────────────────────────────────────
alter table absence_notifications enable row level security;

create policy "absences_staff" on absence_notifications
  for all using (
    exists (
      select 1 from students s
      where s.id = absence_notifications.student_id
        and is_staff_for_school(s.school_id)
    )
  );

-- ─── admission_applications ──────────────────────────────────────────────────
alter table admission_applications enable row level security;

create policy "admissions_staff" on admission_applications
  for all using (is_staff_for_school(school_id));

-- Public insert allowed (parents apply without an account)
create policy "admissions_public_insert" on admission_applications
  for insert with check (true);

-- ─── receipts ────────────────────────────────────────────────────────────────
alter table receipts enable row level security;

create policy "receipts_staff" on receipts
  for all using (
    exists (
      select 1 from fee_payments fp
      join students s on s.id = fp.student_id
      where fp.id = receipts.payment_id
        and is_staff_for_school(s.school_id)
    )
  );

create policy "receipts_parent_read" on receipts
  for select using (
    auth_role() = 'parent'
    and exists (
      select 1 from fee_payments fp
      join students s on s.id = fp.student_id
      where fp.id = receipts.payment_id
        and (
          s.parent_user_id = auth.uid()
          or s.parent_primary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
          or s.parent_secondary_phone = (auth.jwt() -> 'user_metadata' ->> 'phone')
        )
    )
  );
